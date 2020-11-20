# phototrail

Bare-bones Instagram-like, uses Auth0 for authentication.

## Installation

```
# Install dependencies and build the project
make install build
# Create the data directory and initialize the database
mkdir data
sqlite3 data/database.sqlite < database.sql
# Run the server
./build/phototrail -auth-domain <auth0 domain> -auth-client-id <auth0 app client id>
```

## Development

`make serve` will run the webapp independently using Parcel using the
`config.js` file (example provided) for finding the baseURL and auth
configuration.
