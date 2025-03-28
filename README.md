# OL Explorer - Open Libra Blockchain Explorer

A modern, responsive blockchain explorer for the Open Libra blockchain, built with React Native, Expo, TypeScript, and LegendApp for state management.

![Open Libra Explorer](public/og-image.png)

## Features

- Real-time blockchain statistics (block height, epoch, chain ID)
- Transaction list with automatic updates
- Detailed transaction information pages
- Account lookup with resources and balance information
- Smart search functionality that tries account lookup first, then transaction search
- Dark mode UI optimized for readability
- Progressive Web App (PWA) capabilities for offline access
- Responsive design that works on desktop, tablet, and mobile

## Live Demo

Visit the live explorer at [https://explorer.openlibra.space](https://explorer.openlibra.space)

## Progressive Web App (PWA)

OL Explorer is configured as a Progressive Web App, allowing users to install it on their devices and access certain features offline.

### PWA Features

- **Installable**: Users can add the app to their home screen/desktop
- **Offline Support**: Basic navigation and cached content remain accessible without an internet connection
- **Fast Loading**: Caches important assets for quick startup
- **Responsive**: Works on all device sizes

### Installing as PWA

#### On Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Tap the Share button (iOS) or Menu button (Android)
3. Select "Add to Home Screen" or "Install App"

#### On Desktop (Chrome, Edge)
1. Open the app in your browser
2. Look for the install icon in the address bar
3. Click "Install" in the prompt

### Verifying PWA Setup

To verify the PWA configuration is correct, run:
```bash
npm run verify-pwa
```

This script checks for all required PWA assets and configurations.

## Getting Started

### Prerequisites

- Node.js 18.x or newer
- npm 9.x or newer
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sirouk/ol-explorer.git
   cd ol-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:8082](http://localhost:8082) in your browser

## Scripts

- `npm run dev` - Start the development server
- `npm run web` - Start the web development server
- `npm run ios` - Start the iOS simulator
- `npm run android` - Start the Android emulator
- `npm run build` - Build for web deployment
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run cypress:open` - Open Cypress for E2E testing
- `npm run cypress:run` - Run Cypress tests headlessly

## Testing

The project includes comprehensive testing:

### Unit and Integration Tests with Jest

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Twin Network Testing

For consistent and reliable testing, we use a containerized "twin network" that mirrors the Libra mainnet.

#### Setting Up the Twin Network

There are two ways to set up the twin network:

##### Using Docker (Recommended)

1. Build the Docker image:
   ```bash
   docker build -t libra-twin-network -f Dockerfile.testnet .
   ```

2. Run the container:
   ```bash
   docker run -d -p 34597:34597 --name libra-twin-network libra-twin-network
   ```

3. Wait for the twin network to be available:
   ```bash
   timeout 300 bash -c 'until curl -s http://127.0.0.1:34597/v1 > /dev/null; do sleep 5; done'
   ```

Alternatively, use Docker Compose:
```bash
docker-compose -f docker-compose.testnet.yml up -d
```

##### Manual Setup

For manual setup, follow these steps:

```bash
cd $HOME
rm -rf ./libra-framework
git clone https://github.com/0o-de-lally/libra-framework
cd ./libra-framework
git checkout release-8.0.0-rc.0
sudo bash util/dev_setup.sh

# run the node to catch some blocks
libra config fullnode-init
libra node

# check on blocks while this runs
watch -n1 'echo "\nConnections:";curl 127.0.0.1:9101/metrics 2> /dev/null | grep "_connections"; echo "\nMainnet Version:"; curl -s https://rpc.openlibra.space:8080/v1 | jq .ledger_version; echo "\nYour Node:"; curl -s localhost:9101/metrics | grep diem_state_sync_version;'

# stop the node, prepare the move framework
cd $HOME/libra-framework/framework/
libra move framework release

# create a twin network
cd $HOME/libra-framework/testsuites/twin
DIEM_FORGE_NODE_BIN_PATH=/root/.cargo/bin/libra cargo run -- --db-dir $HOME/.libra/data/db &
```

#### Running Tests with the Twin Network

When running tests with the twin network, set the following environment variables:

```bash
# For Jest tests
export LIBRA_RPC_URL=http://127.0.0.1:34597/v1
export TEST_ACCOUNT=9A710919B1A1E67EDA335269C0085C91
export TEST_TRANSACTION=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm test

# For Cypress tests
export CYPRESS_twinNetworkRpc=http://127.0.0.1:34597/v1
export CYPRESS_testAccount=9A710919B1A1E67EDA335269C0085C91
export CYPRESS_testTransaction=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm run cypress:run
```

For more detailed information, see [TESTNET.md](TESTNET.md).

### End-to-End Testing with Cypress

#### Prerequisites for Cypress Testing

On Linux systems, you'll need to install several dependencies for Cypress to run properly:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtkextra-dev libxss-dev libgconf2-dev xvfb

# CentOS
sudo yum install -y xorg-x11-server-Xvfb gtk2-devel gtk3-devel libnotify-devel GConf2 nss libXScrnSaver alsa-lib
```

On macOS, you'll need:
```bash
brew install --cask xquartz
```

#### Running Cypress Tests

To open Cypress in interactive mode:
```bash
# Make sure the web server is running first
npm run web

# In a new terminal
npm run cypress:open
```

To run Cypress tests headlessly:
```bash
# For Linux, using Xvfb for headless mode
xvfb-run --auto-servernum npm run cypress:run

# For macOS/Windows
npm run cypress:run
```

## Project Structure

```
ol-explorer/
├── app/                    # Expo Router application screens
│   ├── index.tsx           # Home page
│   ├── _layout.tsx         # Root layout component
│   ├── account/            # Account-related routes
│   └── tx/                 # Transaction-related routes
├── assets/                 # Static assets
├── context/                # Project documentation
├── context-for-llm/        # Detailed project documentation
├── cypress/                # Cypress E2E tests
│   ├── e2e/                # Test specs
│   ├── fixtures/           # Test data
│   └── support/            # Support files and commands
├── public/                 # Public assets
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── config/             # Configuration files
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation configuration
│   ├── screens/            # Screen components
│   ├── services/           # API and SDK services
│   ├── store/              # State management
│   ├── tests/              # Test files
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── .github/                # GitHub workflows
├── .eslintrc.js            # ESLint configuration
├── babel.config.js         # Babel configuration
├── cypress.config.js       # Cypress configuration
├── global.css              # Global CSS styles
├── jest.config.js          # Jest configuration
├── metro.config.js         # Metro bundler configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Key Technologies

- **React Native & Expo**: Cross-platform mobile and web development
- **TypeScript**: Type-safe JavaScript
- **LegendApp/State**: Observable state management
- **NativeWind**: Tailwind CSS for React Native
- **Expo Router**: File-based routing
- **open-libra-sdk**: SDK for Open Libra blockchain interactions
- **Jest & React Testing Library**: Unit and integration testing
- **Cypress**: End-to-end testing

## Deployment

### Web Deployment with Nginx

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the build to your server:
   ```bash
   scp -r web-build/* user@server:/var/www/ol-explorer/
   ```

3. Configure Nginx:
   ```nginx
   server {
       listen 80;
       server_name explorer.openlibra.space;
       
       root /var/www/ol-explorer;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. Set up SSL with Certbot:
   ```bash
   sudo certbot --nginx -d explorer.openlibra.space
   ```

### Static Hosting (GitHub Pages, Cloudflare Pages)

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```bash
   npx gh-pages -d web-build
   ```

Or configure Cloudflare Pages to:
- Build command: `npm run build`
- Output directory: `web-build`

## CI/CD

The project uses GitHub Actions for continuous integration and deployment. The workflow:

1. Runs TypeScript type checking
2. Runs ESLint
3. Runs Jest tests
4. Runs Cypress tests
5. Deploys to staging on push to main branch
6. Can be manually promoted to production

## Configuration

### SDK Configuration

Configure the Open Libra SDK in `src/config/sdkConfig.ts`:

```typescript
export default {
  rpcUrl: 'https://rpc.openlibra.space:8080/v1',
  // ... other SDK configuration options
};
```

### Environment Variables

For local development, create a `.env.local` file:

```
EXPO_PUBLIC_RPC_URL=https://rpc.openlibra.space:8080/v1
```

## Troubleshooting

### Cypress Issues

- **Cypress fails to start**: Make sure all dependencies are installed (see Prerequisites for Cypress Testing)
- **Test timeouts**: Check if the Expo server is running on the correct port (8082)
- **Port conflicts**: If port 8082 is already in use, you can specify a different port with `--port` flag

### Jest Testing Issues

- **Module not found errors**: Check that all dependencies are properly installed and imported
- **TypeScript errors**: Run `npm run typecheck` to identify type issues
- **Test timeouts**: Increase the timeout in the test configuration if tests involve asynchronous operations

## Future Maintenance

See [context-for-llm/07-future-updates.md](context-for-llm/07-future-updates.md) for detailed information on maintaining and updating the project.

## Adding New Features

See [context-for-llm/08-additional-features.md](context-for-llm/08-additional-features.md) for guidance on extending the project with new features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Open Libra team for their blockchain technology
- Expo team for their excellent React Native framework
- LegendApp team for their state management library 