const { subscribeToQueue } = require('./broker')
const sendEmail = require('./../email')


module.exports = function () {

  // resiter listener for the auth 
  subscribeToQueue('AUTH_NOTIFICATIONS.user_registration', async (data) => {

    const emailHtmlTemplate = `

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome Email</title>
</head>

<body style="
  margin: 0;
  padding: 0;
  background-color: #f4f7fb;
  font-family: Arial, sans-serif;
">

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          "
        >

          <!-- Header -->
          <tr>
            <td
              align="center"
              style="
                background: linear-gradient(135deg, #667eea, #764ba2);
                padding: 50px 20px;
                color: white;
              "
            >
              <h1 style="
                margin: 0;
                font-size: 34px;
                font-weight: bold;
              ">
                Welcome 🚀
              </h1>

              <p style="
                margin-top: 10px;
                font-size: 16px;
                opacity: 0.9;
              ">
                Your journey starts here
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 35px;">

              <h2 style="
                margin-top: 0;
                color: #222;
                font-size: 28px;
              ">
                Hi ${data.fullName.firstName},
              </h2>

              <p style="
                color: #555;
                font-size: 16px;
                line-height: 1.8;
              ">
                Thank you for registering with us.
                We're super excited to have you onboard 🎉
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin: 30px 0;
                  background: #f8f9ff;
                  border-radius: 14px;
                "
              >
                <tr>
                  <td style="padding: 25px;">

                    <p style="
                      margin: 0 0 10px 0;
                      color: #666;
                      font-size: 14px;
                    ">
                      ACCOUNT DETAILS
                    </p>

                    <p style="
                      margin: 8px 0;
                      color: #222;
                      font-size: 16px;
                    ">
                      <strong>Username:</strong> ${data.username}
                    </p>

                    <p style="
                      margin: 8px 0;
                      color: #222;
                      font-size: 16px;
                    ">
                      <strong>Email:</strong> ${data.email}
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center">
                    <a
                      href="http://localhost:5173"
                      style="
                        display: inline-block;
                        padding: 15px 35px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        text-decoration: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: bold;
                      "
                    >
                      Explore Now
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                padding: 25px;
                background: #fafafa;
                color: #888;
                font-size: 13px;
              "
            >
              © 2026 MarketPlace. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

    await sendEmail(data.email, 'Welcome to MarketPlace!', 'Thank you for registering with us. We are excited to have you on board!', emailHtmlTemplate);
  });

  // PAYMENT SUCCESS
  subscribeToQueue('PAYMENT_NOTIFICATION.PAYMENT_COMPLETION', async (data) => {


    const emailHtmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Successful</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f7fb;
  font-family: Arial, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:40px 20px;">

<table width="600" cellpadding="0" cellspacing="0"
style="
  background:#fff;
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,0.08);
">

<tr>
<td align="center"
style="
  background:linear-gradient(135deg,#00b09b,#96c93d);
  padding:50px 20px;
  color:white;
">
  <h1 style="margin:0;font-size:34px;">
    Payment Successful ✅
  </h1>

  <p style="
    margin-top:10px;
    font-size:16px;
    opacity:0.9;
  ">
    Your payment has been completed successfully
  </p>
</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="
  margin-top:0;
  color:#222;
">
  Hi ${data.username || "User"},
</h2>

<p style="
  color:#555;
  line-height:1.8;
  font-size:16px;
">
  Thank you for your payment 🎉
</p>

<table width="100%"
style="
  background:#f8f9ff;
  border-radius:14px;
  margin:30px 0;
">
<tr>
<td style="padding:25px;">

<p><strong>Order ID:</strong> ${data.orderId}</p>
<p><strong>Payment ID:</strong> ${data.paymentId}</p>
<p><strong>Amount:</strong> ${data.amount} ${data.currency}</p>

</td>
</tr>
</table>

</td>
</tr>

<tr>
<td align="center"
style="
  padding:25px;
  background:#fafafa;
  color:#888;
  font-size:13px;
">
  © 2026 MarketPlace. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

    await sendEmail(
      data.email,
      'Payment Successful ✅',
      'Your payment has been completed successfully.',
      emailHtmlTemplate
    );
  });




  // PAYMENT FAILURE
  subscribeToQueue('PAYMENT_NOTIFICATION.PAYMENT_FAILURE', async (data) => {


    const emailHtmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Failed</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f7fb;
  font-family: Arial, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:40px 20px;">

<table width="600" cellpadding="0" cellspacing="0"
style="
  background:#fff;
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,0.08);
">

<tr>
<td align="center"
style="
  background:linear-gradient(135deg,#ff416c,#ff4b2b);
  padding:50px 20px;
  color:white;
">

<h1 style="margin:0;font-size:34px;">
  Payment Failed ❌
</h1>

<p style="
  margin-top:10px;
  font-size:16px;
  opacity:0.9;
">
  Your payment could not be processed
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="
  margin-top:0;
  color:#222;
">
  Hi ${data.username || "User"},
</h2>

<p style="
  color:#555;
  line-height:1.8;
  font-size:16px;
">
  Unfortunately your payment failed.
  Please try again.
</p>

<table width="100%"
style="
  background:#fff5f5;
  border-radius:14px;
  margin:30px 0;
">
<tr>
<td style="padding:25px;">

<p><strong>Order ID:</strong> ${data.orderId || "N/A"}</p>
<p><strong>Amount:</strong> ${data.amount || 0} ${data.currency || ""}</p>

</td>
</tr>
</table>

</td>
</tr>

<tr>
<td align="center"
style="
  padding:25px;
  background:#fafafa;
  color:#888;
  font-size:13px;
">
  © 2026 MarketPlace. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

    await sendEmail(
      data.email,
      'Payment Failed ❌',
      'Your payment failed. Please try again.',
      emailHtmlTemplate
    );
  });


  // PRODUCT CREATED
  subscribeToQueue('PRODUCT-NOTIFICATION.product-created', async (data) => {

    const emailHtmlTemplate = ` <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <title>Product Created</title> </head> <body style=" margin:0; padding:0; background:#f4f7fb; font-family: Arial, sans-serif; "> <table width="100%" cellpadding="0" cellspacing="0"> <tr> <td align="center" style="padding:40px 20px;"> <table width="600" cellpadding="0" cellspacing="0" style=" background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); "> <!-- HEADER --> <tr> <td align="center" style=" background:linear-gradient(135deg,#4facfe,#00f2fe); padding:50px 20px; color:white; "> <h1 style=" margin:0; font-size:34px; "> Product Published 🚀 </h1> <p style=" margin-top:10px; font-size:16px; opacity:0.9; "> Your product is now live on Marketplace </p> </td> </tr> <!-- CONTENT --> <tr> <td style="padding:40px 35px;"> <h2 style=" margin-top:0; color:#222; "> Hello Seller 👋 </h2> <p style=" color:#555; line-height:1.8; font-size:16px; "> Your new product has been successfully published and is now visible to customers 🎉 </p> <table width="100%" style=" background:#f8f9ff; border-radius:14px; margin:30px 0; " > <tr> <td style="padding:25px;"> <p style="margin:10px 0;"> <strong>Product Name:</strong> ${data.title} </p> ${data.brand ? ` <p style="margin:10px 0;"> <strong>Brand:</strong> ${data.brand} </p> ` : ""} <p style="margin:10px 0;"> <strong>Status:</strong> Live ✅ </p> </td> </tr> </table> <!-- BUTTON --> <table cellpadding="0" cellspacing="0" border="0" align="center"> <tr> <td align="center"> <a href="http://localhost:5173/seller/dashboard" style=" display:inline-block; padding:15px 35px; background:linear-gradient(135deg,#4facfe,#00f2fe); color:white; text-decoration:none; border-radius:12px; font-size:16px; font-weight:bold; " > View Dashboard </a> </td> </tr> </table> </td> </tr> <!-- FOOTER --> <tr> <td align="center" style=" padding:25px; background:#fafafa; color:#888; font-size:13px; "> © 2026 MarketPlace. All rights reserved. </td> </tr> </table> </td> </tr> </table> </body> </html> `;

    await sendEmail(
      data.email,
      'Product Published Successfully 🚀',
      'Your product has been published successfully.',
      emailHtmlTemplate
    );
  })


};