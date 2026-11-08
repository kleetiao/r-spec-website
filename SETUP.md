# Set up the replacement APIs

The R-Spec project now uses these three services.

| Feature | API/service | What you need |
| --- | --- | --- |
| Member login | Google Identity Services | A Google account and a Web application OAuth client ID |
| Shop map | OpenStreetMap embed/tile service | Internet access |
| Online payment demonstration | PayPal Orders v2 Sandbox | A PayPal developer account and sandbox app |

PayPal Sandbox simulates payments between test accounts. [PayPal Sandbox documentation](https://developer.paypal.com/sandbox-testing/accounts)

## 1. Open your settings in VS Code

1. Open the **r-spec-api** folder.
2. In the left Explorer panel, click **.env**.
3. If you need a fresh file, copy **.env.example** and name the copy exactly **.env**.
4. Fill in the Google client ID and both PayPal settings using sections 2 and 3.

```dotenv
GOOGLE_CLIENT_ID=
PAYPAL_SANDBOX_CLIENT_ID=
PAYPAL_SANDBOX_CLIENT_SECRET=
SHOP_ADDRESS="12 Rizal St., Bacolod"
SHOP_LATITUDE=
SHOP_LONGITUDE=
PORT=3000
PUBLIC_ORIGIN=
```

Save with **Ctrl+S** after each change. Keep your PayPal secret in this local file and cover it in screenshots.

## 2. Make Google login work

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) and select your R-Spec project or create one.
2. Open **Google Auth Platform**. Complete **Branding** and **Audience** if prompted. Choose **External** for personal Google accounts and add your account under **Test users** if that section is available.
3. Go to **Clients**. Open your existing **Web application** client or select **Create client → Web application**.
4. Add `http://localhost` and `http://localhost:3000` under **Authorized JavaScript origins** and save.
5. Copy the **Client ID** ending in `.apps.googleusercontent.com` into `GOOGLE_CLIENT_ID=` in your local `.env`. If your settings already contain that client's ID, keep it.
6. Save and follow section 5 to start the website.

R-Spec uses the Google sign-in button's popup and verifies the ID token on the server. The Google setting for this flow is the web Client ID. [Google sign-in setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

**Test it.** Open the site at **http://localhost:3000** in your browser. Click **Log in → Sign in with Google** and choose your account. **My garage** should show your name. Reload to check the session, then click **Log out**.

## 3. Make PayPal test checkout work

### Get the app credentials

1. Open [PayPal Developer](https://developer.paypal.com/) and choose **Log in to Dashboard**. Sign in or create your developer account.
2. Open **Apps & Credentials**.
3. Select **Sandbox**.
4. Open the default sandbox app or choose **Create App**.
5. For a new app, enter **R Spec Website** and associate it with your sandbox **Business** account.
6. Copy its **Client ID** into **PAYPAL_SANDBOX_CLIENT_ID** in **.env**.
7. Reveal and copy the app's **Secret** into **PAYPAL_SANDBOX_CLIENT_SECRET**.
8. Save the file.

[PayPal app credentials guide](https://developer.paypal.com/api/get-started/)

### Find your test buyer

1. In the PayPal Developer Dashboard, open **Testing Tools → Sandbox Accounts**.
2. Find the **Personal** sandbox account. This is your test customer.
3. Use its menu to open **View/Edit Account**.
4. Find its generated email address and password. Keep them available for the sandbox checkout.
5. The app belongs to the **Business** sandbox account, which receives the test payment.

PayPal normally creates a Personal and a Business sandbox account when you first use its Developer Dashboard. Use the Personal sandbox login as the buyer during checkout. [Sandbox account instructions](https://developer.paypal.com/sandbox-testing/accounts)

### Try a payment

1. Restart the R-Spec server using section 5.
2. Open the site and add a product using **+**.
3. Open the bag, check the quantity and subtotal, and click **Continue to PayPal Sandbox**.
4. On the PayPal Sandbox page, sign in using your **Personal sandbox account's** email and password.
5. Approve the test purchase.
6. Return to R-Spec. Wait for **PayPal Sandbox payment confirmed** and the order ID.
7. Check the test transaction in the sandbox buyer or seller activity.

The app sends amounts in Philippine pesos. PayPal supports PHP. The sandbox seller may need PHP enabled in its payment receiving preferences for captures to complete immediately. [PayPal currency guidance](https://developer.paypal.com/api/codes/currency)

Payment confirmation is checked on the server. If it fails, use **Retry payment confirmation** and check sandbox activity. Keep the R-Spec server running throughout the flow because this classroom version stores checkout records in memory.

## 4. Shop map

The OpenStreetMap map loads with internet access. The address shown is **12 Rizal St., Bacolod**.

The initial map shows the Bacolod area. Exact shop coordinates are still awaiting confirmation.

To set a verified shop pin, enter the latitude and longitude from the actual shop location in **SHOP_LATITUDE** and **SHOP_LONGITUDE**, save, and restart. Both values are needed.

The embedded map displays OpenStreetMap attribution and uses browser caching. Keep attribution visible and use ordinary interactive map viewing. The public tile service is shared and has usage limits. [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)

## 5. Start and restart the website

1. In VS Code, choose **Terminal → New Terminal**.
2. Confirm the terminal is opened in the **r-spec-api** folder.
3. If you already have the server running in a terminal, click that terminal and press **Ctrl+C**. Confirm with **Y** if prompted.
4. Run `npm.cmd ci` when setting up this version to install the login library.
5. Enter the following command.

```powershell
npm.cmd start
```

6. Wait for **R-Spec is ready at http://localhost:3000**.
7. Open [your website](http://localhost:3000/), refresh, and leave the terminal running.

Save **.env** and restart the server after each settings change. This version runs with Node.js 22 or newer.

## 6. Common problems

| Problem | What to check |
| --- | --- |
| Member login is being prepared | Fill in **GOOGLE_CLIENT_ID**, save, and restart. |
| Google reports an origin mismatch | Add **http://localhost:3000** to the web client's authorized JavaScript origins and open that exact address. |
| Google denies access to your account | Check the OAuth app's audience and test users. |
| Login request expired | Close the login dialog and open it again. A request lasts ten minutes. |
| Online checkout is being prepared | Fill in both PayPal Sandbox settings, save, and restart. |
| Provider could not complete the request | Check that both PayPal credentials come from the same Sandbox app and that the computer has internet access. |
| Buyer cannot sign in | Use the generated Personal sandbox account credentials from the Developer Dashboard. |
| Payment awaiting confirmation | Check sandbox activity and seller currency preferences, then retry confirmation. |
| Checkout session expired after restart | Check sandbox activity to see whether a payment completed. Start a new checkout for a fresh demonstration. |
| Map shows Bacolod without a shop marker | Enter both verified shop coordinates in the settings. |
| EADDRINUSE / port 3000 in use | Stop the other running copy, then start again. |
| You use a different host or port | Set **PUBLIC_ORIGIN** to the exact origin you open and add that origin in the Google web client's settings. |

## 7. Presentation steps

1. Explain **Google Identity Services** and demonstrate signing in.
2. Explain **OpenStreetMap embed/tile service**, then show the map and address.
3. Explain **PayPal Orders v2**, then create and approve a sandbox payment.
4. Show the confirmed order ID after PayPal returns.
5. Have [the backup proposals](PROPOSALS.md) ready.

Ask your instructor whether the OpenStreetMap embed/tile service meets their definition of an API integration. It serves map images instead of a JSON response.
