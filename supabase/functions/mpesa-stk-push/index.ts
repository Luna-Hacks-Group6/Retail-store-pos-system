import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKPushRequest {
  phone_number: string;
  amount: number;
  sale_id: string;
  account_reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const passkey = Deno.env.get('MPESA_PASSKEY');

    if (!consumerKey || !consumerSecret || !passkey) {
      console.error('Missing M-Pesa API credentials');
      return new Response(
        JSON.stringify({ error: 'M-Pesa API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get shortcode from settings
    const { data: shortcodeSetting, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'mpesa_shortcode')
      .maybeSingle();

    if (settingsError || !shortcodeSetting?.value) {
      console.error('M-Pesa shortcode not configured in settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'M-Pesa Till Number not configured. Please set it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortcode = shortcodeSetting.value;
    const { phone_number, amount, sale_id, account_reference } = await req.json() as STKPushRequest;

    console.log(`STK Push request: phone=${phone_number}, amount=${amount}, sale_id=${sale_id}`);

    // Validate inputs
    if (!phone_number || !amount || !sale_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone_number, amount, sale_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (ensure 254 prefix)
    let formattedPhone = phone_number.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Get OAuth token
    const authString = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(
      'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('OAuth token error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with M-Pesa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    // STK Push request
    const stkResponse = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerBuyGoodsOnline',
          Amount: Math.round(amount),
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: account_reference || 'POS Sale',
          TransactionDesc: `Payment for sale ${sale_id}`,
        }),
      }
    );

    const stkData = await stkResponse.json();
    console.log('STK Push response:', JSON.stringify(stkData));

    if (stkData.ResponseCode === '0') {
      // Create transaction record
      const transactionCode = `STK_${Date.now()}`;
      const { error: insertError } = await supabase
        .from('mpesa_transactions')
        .insert({
          sale_id,
          phone_number: formattedPhone,
          amount: Math.round(amount),
          transaction_code: transactionCode,
          status: 'pending',
          checkout_request_id: stkData.CheckoutRequestID,
          merchant_request_id: stkData.MerchantRequestID,
        });

      if (insertError) {
        console.error('Failed to create transaction record:', insertError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkout_request_id: stkData.CheckoutRequestID,
          merchant_request_id: stkData.MerchantRequestID,
          message: 'STK Push sent successfully',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('STK Push failed:', stkData);
      return new Response(
        JSON.stringify({
          success: false,
          error: stkData.errorMessage || stkData.ResponseDescription || 'STK Push failed',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('STK Push error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});