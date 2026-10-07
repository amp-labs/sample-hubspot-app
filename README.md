<br/>
<div align="center">
    <a href="https://www.withampersand.com/?utm_source=github&utm_medium=readme&utm_campaign=sample-hubspot-app&utm_content=logo">
    <img src="https://res.cloudinary.com/dycvts6vp/image/upload/v1723671980/ampersand-logo-black.svg" height="30" align="center" alt="Ampersand logo" >
    </a>
<br/>
<br/>

<div align="center">

[![Documentation](https://img.shields.io/badge/Read%20our%20Documentation-black?logo=book)](https://docs.withampersand.com) [![Discord](https://img.shields.io/badge/Join%20The%20Community-black?logo=discord)](https://discord.gg/BWP4BpKHvf) <img src="https://img.shields.io/static/v1?label=license&message=MIT&color=white" alt="License">
</div>

</div>

# Sample HubSpot app for Ampersand

Everything you need to connect to your customers' HubSpot accounts through Ampersand, ready to deploy. Instead of building a HubSpot app by hand, clone this repo, change a few values, and deploy.

It includes two parts that are already set up to work together:

| Folder | What it is | Deploy with |
|---|---|---|
| `hubspot-app/` | Your HubSpot app: OAuth with Ampersand's redirect URL, scopes, and webhooks for subscribe actions | `hs project upload` |
| `ampersand/` | Your Ampersand integration (`amp.yaml`): read, write, subscribe, and proxy actions for contacts, companies, and deals | `amp deploy` |

```
sample-hubspot-app/
├── hubspot-app/
│   ├── hsproject.json                  # HubSpot project name and platform version
│   └── src/app/
│       ├── app-hsmeta.json             # App name, redirect URL, and scopes
│       └── webhooks/
│           └── webhooks-hsmeta.json    # Which HubSpot events to send to Ampersand
├── ampersand/
│   └── amp.yaml                        # Which objects to read, write, and subscribe to
└── setup.mjs                           # Fills in the webhook URL for you (step 3)
```

## Before you start

- A [HubSpot developer account](https://app.hubspot.com/signup-hubspot/crm?intent=developer)
- An [Ampersand project](https://dashboard.withampersand.com/sign-up) with a webhook [destination](https://dashboard.withampersand.com/projects/_/destinations) called `defaultWebhook` (or change the destination name in `amp.yaml`). If you don't have an endpoint yet, [play.svix.com](https://play.svix.com) gives you a disposable one that shows incoming payloads in the browser.
- [Node.js](https://nodejs.org) 20 or later
- The [HubSpot CLI](https://developers.hubspot.com/docs/developer-tooling/local-development/hubspot-cli/install-the-cli), latest version: `npm install -g @hubspot/cli@latest`. This app uses HubSpot platform version `2026.09`, which older CLI versions don't recognize.
- The [Ampersand CLI](https://docs.withampersand.com/cli/overview). On macOS: `brew tap amp-labs/cli && brew install amp-labs/cli/cli`. For Windows, see the CLI docs.

## 1. Clone this repo

```sh
git clone https://github.com/amp-labs/sample-hubspot-app.git
cd sample-hubspot-app
```

## 2. Deploy the Ampersand integration

```sh
amp login
amp deploy ampersand -p <your-ampersand-project-name>
```

If you need the IDs yourself later, the **project ID** is on the Dashboard's [General Settings page](https://dashboard.withampersand.com/projects/_/settings) and the **integration ID** is on its [Home page](https://dashboard.withampersand.com/projects/_) (or run `amp list:integrations -p <your-ampersand-project-name>`).

## 3. Point the HubSpot webhooks at Ampersand

From the root of this repo, run:

```sh
node setup.mjs
```

It looks up your project and integration IDs with the Ampersand CLI (or asks for them) and puts them into the webhook URL in `hubspot-app/src/app/webhooks/webhooks-hsmeta.json`:

```
https://subscribe-webhook.withampersand.com/v1/projects/PROJECT_ID/integrations/INTEGRATION_ID
```

You can also pass them yourself with `node setup.mjs --project-id <id> --integration-id <id>`, or edit the file by hand.

If you don't need real-time updates, delete the `hubspot-app/src/app/webhooks` folder and the `subscribe` section of `amp.yaml` instead.

## 4. Name your app

In `hubspot-app/src/app/app-hsmeta.json`, change `name` and `description` (your customers see these when they connect HubSpot) and replace the `support` details with your own.

## 5. Upload the HubSpot app

```sh
cd hubspot-app
hs account auth          # pick your developer account
hs project validate
hs project upload        # choose "yes" to create the project
```

## 6. Accept HubSpot's Acceptable Use Policy

Do this once per developer account, before anyone can install your app.

1. In HubSpot, go to **Development** (bottom of the left nav) and open your project.
2. Under **Project Components**, click your app.
3. Go to the **Distribution** tab, click **Begin Publishing**, and complete only the first step: **Agree to HubSpot's Acceptable Use Policy**.

## 7. Add the app to Ampersand

1. In your HubSpot app, open the **Auth** tab and copy the **Client ID** and **Client Secret**.
2. In the [Ampersand Dashboard](https://dashboard.withampersand.com), go to **Provider apps** and pick **HubSpot**.
3. Paste the Client ID and Client Secret.
4. Copy the scopes below **exactly**, one per line: required scopes into **Scopes**, and optional scopes into **Optional scopes**. Then click **Save changes**.

**Scopes**

```
oauth
crm.objects.contacts.read
crm.objects.contacts.write
crm.schemas.contacts.read
crm.objects.companies.read
crm.objects.companies.write
crm.schemas.companies.read
crm.objects.deals.read
crm.objects.deals.write
crm.schemas.deals.read
crm.objects.owners.read
```

**Optional scopes**

```
crm.objects.tickets.read
crm.objects.tickets.write
crm.objects.users.read
crm.lists.read
sales-email-read
crm.objects.custom.read
crm.objects.custom.write
crm.schemas.custom.read
crm.objects.leads.read
crm.objects.leads.write
marketing.campaigns.read
```

## 8. Connect a HubSpot account

In your app, wrap the [InstallIntegration](https://docs.withampersand.com/embeddable-ui-components#install-integration) component in `AmpersandProvider` with your Ampersand project and a **UI Library** API key (create one under [API keys](https://dashboard.withampersand.com/projects/_/api-keys)), and set `integration="hubspotIntegration"`. Then use it to connect a HubSpot account.

## 9. Check that it worked

- **Reads:** right after a customer installs, existing contacts, companies, and deals arrive at your `defaultWebhook` destination. After that, changes arrive every 10 minutes.
- **Subscribe:** create a contact in the connected HubSpot account, then change its lifecycle stage. Both events arrive within seconds.
- To see every read, write, and proxy call and whether it succeeded, go to **Integrations** in the Ampersand Dashboard, open `hubspotIntegration`, and select the installation. To see what HubSpot sent, open your app in HubSpot and go to **Monitoring**.

## Customize it

### Add an object

1. Uncomment it in `ampersand/amp.yaml` (tickets and emails are ready to go), or add your own.
2. Make sure its scopes are in `app-hsmeta.json` and in Ampersand:
   - Most objects need `crm.objects.<object>.read` (and `.write` to write). Emails need `sales-email-read`. See [HubSpot's full scope list](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes#list-of-available-scopes).
   - If a scope only works on some HubSpot plans (see the **Required account tier** column in [this list](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/scopes)), put it in `optionalScopes`. Otherwise customers on other plans can't connect.
3. From the repo root, run `amp deploy ampersand -p <your-ampersand-project-name>`. If you changed scopes, also run `hs project upload` in `hubspot-app`.

### Subscribe to another object

1. Add it to the `subscribe` section of `amp.yaml` (companies is ready to uncomment).
2. In `webhooks-hsmeta.json`, set its subscriptions to `"active": true`, or add new ones. Every field in `requiredWatchFields` needs a matching `object.propertyChange` subscription. See [HubSpot's webhook docs](https://developers.hubspot.com/docs/apps/developer-platform/add-features/configure-webhooks#webhook-configuration).
3. From the repo root, run `amp deploy ampersand -p <your-ampersand-project-name>`, then run `hs project upload` in `hubspot-app`.

HubSpot subscribe actions can't notify you about changes to custom fields. Contact support@withampersand.com if you need this.

### Remove what you don't need

Remove objects from `amp.yaml` and their scopes from `app-hsmeta.json` and Ampersand. Fewer scopes means a shorter consent screen for your customers.

## Troubleshooting

### "This app hasn't been granted all required scopes"

A read or write fails with an error similar to:

```text
HTTP status 403: forbidden: This app hasn't been granted all required scopes to make this call.
```

The scopes in your HubSpot app and in Ampersand don't match, or the customer connected before you added a scope. To fix it:

1. Make sure the scopes in `hubspot-app/src/app/app-hsmeta.json` match the **Scopes** and **Optional scopes** boxes in Ampersand (**Provider apps** > **HubSpot**) exactly.
2. If you changed scopes, run `hs project upload` in `hubspot-app`.
3. Ask customers who connected before the change to reconnect, so they grant the new scopes.

### "414 URI Too Long" on reads

A scheduled read pauses with an HTTP 414 error. This happens when a read asks for every field (`optionalFieldsAuto: all`) and the customer's HubSpot account has many custom properties. This sample avoids it by using short `optionalFields` lists. If you switched to `optionalFieldsAuto: all`, go back to listing only the fields you need, then [update the installation](https://docs.withampersand.com/reference/installation/update-an-installation) and [unpause the read](https://docs.withampersand.com/reference/read/unpause-reads-for-an-installation).

## Learn more

- [HubSpot provider guide](https://docs.withampersand.com/provider-guides/hubspot)
- [More HubSpot `amp.yaml` examples](https://github.com/amp-labs/samples/tree/main/hubspot)
- [HubSpot developer platform docs](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/overview)
