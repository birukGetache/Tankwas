const axios = require('axios');

async function generateAcessToken() {
    const response = await axios({
        url:process.env.PAYPAL_BASE_URL + '/v1/oauth2/token',
        method: 'post',
        data:"grant_type=client_credentials",
        auth:{
            username:process.env.PAYPAL_CLIENT_ID,
            password:process.env.PAYPAL_SECRET
        }
    })
  
    return response.data.access_token
}

exports.createOrder = async ( finalAmount , tempBookingId )=>{
    const accessToken = await generateAcessToken()
    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + '/v2/checkout/orders',
        method:'post',
        headers:{
            'Content-Type': 'application/json',
            'Authorization':'Bearer ' + accessToken
        },
        data: JSON.stringify({
           intent:'CAPTURE',
           purchase_units:[
            {
                items:[
                    {
                      name:'Tankwas',
                      description:'Tankawas Booking',
                      quantity:1,
                      unit_amount:{
                        currency_code:'USD',
                        value:finalAmount
                      }   
                    }
                ],
                amount:{
                    currency_code:'USD',
                    value:finalAmount,
                    breakdown:{
                        item_total:{
                            currency_code:'USD',
                            value:finalAmount 
                        }
                    }
                }
            }
           ],
           application_context:{
            return_url: process.env.BASE_URL + `/paypalcomplete?tempBookingId=${tempBookingId}`,
            cancel_url: process.env.BASE_URL,
            shipping_preference:"NO_SHIPPING",
            user_action: 'PAY_NOW',
            brand_name: 'Tankwas',
           }
        })
    })

  return response.data.links.find(link => link.rel === 'approve').href

}

exports.capturePayment = async (orderId) =>{
    const accessToken = await getAccessToken()
    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + `/v2/checkout/orders/${orderId}/capture`,
        method: 'POST',
        header:{
            'Content-Type': 'application/json',
            'Authorization':'Bearer ' + accessToken
        }
    })
    return response.data
}
