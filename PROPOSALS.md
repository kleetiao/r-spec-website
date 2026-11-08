# Three API proposals for R-Spec

Each set contains three different integrations. Compare the chosen set against previous presenters and make sure it shares at most one API with each presenter.

## Proposal 1 · Member login, shop map, and online checkout

This set is implemented.

1. **Google Identity Services** signs customers in with a Google account and displays their member profile after the server verifies their sign-in. [Google sign-in documentation](https://developers.google.com/identity/gsi/web/guides/overview)
2. **OpenStreetMap embed/tile service** displays an interactive shop-area map with attribution. Verified coordinates add a shop marker. [OpenStreetMap policy](https://operations.osmfoundation.org/policies/tiles/)
3. **PayPal Orders v2 API** creates and captures sandbox checkout payments for selected parts. [PayPal documentation](https://developer.paypal.com/api/orders/v2)

Demo signing in, opening the shop map, adding a part, and completing a sandbox payment.

The map service returns image tiles through its embedded viewer. Confirm that this meets the instructor's API criteria.

## Proposal 2 · Parts drop alerts, location card, and payment

This set is a backup proposal.

1. **Mailchimp Marketing API** accepts newsletter opt-ins with email confirmation. [Mailchimp documentation](https://mailchimp.com/developer/marketing/api/lists/members/create-member)
2. **Mapbox Static Images API** generates a map card with the shop marker. [Mapbox documentation](https://docs.mapbox.com/api/maps/static-images/)
3. **Xendit Payment Sessions API** starts a hosted test checkout for a parts order. [Xendit documentation](https://docs.xendit.co/apidocs/create-session)

Demo joining a parts announcement list, showing the location card, and opening test checkout. Account eligibility and credentials need to be checked before implementing this alternative.

## Proposal 3 · Promotion signup, pickup map, and checkout

This set is a backup proposal.

1. **Brevo Contacts API** adds customers who opt in to promotions. [Brevo documentation](https://developers.brevo.com/docs/getting-started)
2. **HERE Maps API for JavaScript** displays the pickup location. [HERE documentation](https://www.here.com/docs/bundle/maps-api-for-javascript-developer-guide/page/README.html)
3. **Maya Checkout API** opens a sandbox payment page for a parts order. [Maya documentation](https://developers.maya.ph/reference/about-maya-checkout)

Demo a promotions opt-in, the pickup map, and sandbox checkout. Account eligibility and credentials need to be checked before implementing this alternative.
