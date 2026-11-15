import fs from "fs";
import path from "path";
import os from "os";

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), ".expo", "state.json"), "utf8"),
);
const auth = state.auth || {};
const headers = {
  "content-type": "application/json",
  ...(auth.sessionSecret ? { "expo-session": auth.sessionSecret } : {}),
  ...(auth.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {}),
};

async function gql(query, variables) {
  const res = await fetch("https://api.expo.dev/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

const data = await gql(`
  query {
    app {
      byFullName(fullName: "@gracerun/fusion-express") {
        id
        fullName
        iosAppCredentials {
          id
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            provisioningProfile {
              id
              status
              expiration
              developerPortalIdentifier
            }
          }
        }
      }
    }
  }
`);

const app = data.app.byFullName;
console.log("app", app.id, app.fullName);

const profileIds = [];
for (const cred of app.iosAppCredentials || []) {
  for (const build of cred.iosAppBuildCredentialsList || []) {
    const p = build.provisioningProfile;
    console.log(
      "buildCred",
      build.iosDistributionType,
      p?.id,
      p?.developerPortalIdentifier,
      p?.status,
    );
    if (p?.id) profileIds.push(p.id);
  }
}

if (profileIds.length === 0) {
  console.log("No provisioning profiles found to delete.");
  process.exit(0);
}

const unique = [...new Set(profileIds)];
console.log("Deleting profiles:", unique);

await gql(
  `
  mutation ($ids: [ID!]!) {
    appleProvisioningProfile {
      deleteAppleProvisioningProfiles(ids: $ids) {
        id
      }
    }
  }
`,
  { ids: unique },
);

console.log("Deleted. Next EAS build will recreate profiles with current entitlements.");
