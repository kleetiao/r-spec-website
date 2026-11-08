# R-Spec Parts Marketing

The current proposal uses Sign in with Google, OpenStreetMap's embedded map/tile service, and PayPal Orders v2 in Sandbox.

Open this folder in VS Code and choose **Terminal → New Terminal**. Run `npm.cmd ci` to install the login library, then run `npm.cmd start` and visit [R-Spec](http://localhost:3000/).

Follow [SETUP.md](SETUP.md) to connect Google login and PayPal. The map opens immediately. It shows the Bacolod area until verified shop coordinates are supplied.

The app uses Node.js 22 or newer. Configuration is read from `.env`. Copy `.env.example` if you need a fresh settings file.

Checkout uses the PayPal Sandbox API. The server calculates catalog totals and verifies capture status and amount before showing success. Login sessions and checkout records are held in memory, so keep the server running while completing a demonstration.

[Three proposals](PROPOSALS.md) · [Sign in with Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) · [PayPal Sandbox](https://developer.paypal.com/sandbox-testing/accounts) · [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)
