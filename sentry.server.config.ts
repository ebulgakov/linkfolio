import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: "https://238c58b521aa9d3f587e067e9d79e487@o4510680847220736.ingest.de.sentry.io/4511817818964048",

  // Sample all transactions outside production, 10% in production to limit telemetry volume
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false
});
