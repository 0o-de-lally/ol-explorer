# OL Explorer - Open Libra Blockchain Explorer

A modern, responsive blockchain explorer for the Open Libra blockchain, built with React Native, Expo, TypeScript, and LegendApp for state management. The explorer runs solely on RPC calls and does not require an indexer to function.

<img src="https://raw.githubusercontent.com/sirouk/ol-explorer/refs/heads/main/public/logo.svg" alt="Open Libra Explorer" width="100" />

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

Visit the live explorer at [https://twin-explorer.openlibra.space](https://twin-explorer.openlibra.space)

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

## Progressive Web App (PWA)

OL Explorer is configured as a Progressive Web App, allowing users to install it on their devices and access certain features offline.

### PWA Features

- **Installable**: Users can add the app to their home screen/desktop
- **Offline Support**: Basic navigation and cached content remain accessible without internet
- **Fast Loading**: Critical assets are cached for quick startup
- **Responsive**: Works on all device sizes

### PWA Implementation

The PWA functionality is implemented with:

- **Web App Manifest**: Defines app metadata, icons, and display preferences
- **Service Worker**: Handles caching strategies and offline experience
- **HTML Configuration**: Meta tags for PWA capabilities

For complete details on the PWA implementation, see [PWA Implementation documentation](docs/pwa-implementation.md).

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

## Code Quality

### ESLint Configuration

The project uses ESLint v9 with a flat configuration format in `eslint.config.js`. The configuration includes:

- JavaScript/TypeScript best practices
- React and React Hooks rules
- Special handling for test files

To run linting:
```bash
# Check for linting issues
npm run lint

# Fix automatically fixable issues
npm run lint:fix

# Run custom auto-fixer for issues like unused variables
npm run lint:auto-fix
```

### TypeScript Configuration

The project uses TypeScript with a modern module resolution strategy, configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

The `"bundler"` moduleResolution setting ensures compatibility with:
- ES modules like React Navigation
- Modern import/export syntax
- Libraries using package.json "exports" field
- Path aliases and TypeScript extensions

This configuration prevents common errors when importing modern libraries and provides better integration with the Metro bundler used by Expo.

### Type Checking

To verify TypeScript types:
```bash
npm run typecheck
```

### Validation

Before submitting code changes, run the validation script to ensure everything passes:
```bash
npm run validate
```

## Testing

> **Note:** The testing suite is currently a work in progress. Tests need to be updated and fleshed out from the ground up to cover all features available in the application. This is an ongoing effort.

The project includes comprehensive testing:

### Unit and Integration Tests with Jest

The project uses Jest for unit testing with a configuration in `jest.config.js` and setup in `jest.setup.js`. The setup includes:

- Mock implementations for React Native, Expo, and other dependencies
- Mock implementation for the SDK context and useSdk hook

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

> **Note:** The Docker setup method is not fully implemented yet. We recommend following the manual setup instructions below for the most reliable experience.

There are two ways to set up the twin network:

##### Using Docker (Recommended for future use)

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
# Option 1: Use the provided setup script
# Run the script with an epoch number (e.g., 353)
scripts/setup_twin.sh 353

# OR Option 2: Manual commands if you prefer
# Clone the repo
cd $HOME
rm -rf ./libra-framework
git clone https://github.com/0o-de-lally/libra-framework
cd ./libra-framework

# Checkout the rc.1 tag and install dependencies
git checkout release-8.0.0-rc.1
sudo bash util/dev_setup.sh

# Build the libra binary and copy to .cargo/bin
cargo b --release -p libra 
cp -f target/release/libra ~/.cargo/bin/

# Verify the libra version
libra version

# Clean up any previous data
rm -rf $HOME/.libra

# Build the framework
export DIEM_FORGE_NODE_BIN_PATH=$HOME/.cargo/bin/libra
cd $HOME/libra-framework/framework/
libra move framework release

# Run the twin testnet
# This starts a twin network that restores from epoch 353
libra ops testnet --framework-mrb-path ./releases/head.mrb --twin-epoch-restore=353 smoke

# If you need to restart the twin network later, use:
# libra ops testnet --framework-mrb-path ./releases/head.mrb --twin-reference-db=$HOME/.libra/db_353 smoke
```

The twin network will output the RPC endpoint port - make note of it. Test the RPC endpoint (replace THEPORT with the actual port number):
```bash
curl -s http://127.0.0.1:THEPORT/v1 | jq .ledger_version
```

Important: Touching the account to initialize it. Accounts are lazy-loaded in Open Libra, so you need to "touch" them first. If you have a libra-cli-config.yaml (generated when running the testnet):
```bash
libra txs --config-path /path/to/libra-cli-config.yaml user touch
```

#### Important Notes About the Twin Network

- **Lazy-loaded accounts**: Accounts must be "touched" with a transaction before they can be fully used
- **Resource access**: The network uses the same resource structure as mainnet
- **Module location**: All modules are published on the `0x1` address
- **Transaction verification**: All transactions go through the same verification process as on mainnet

#### Running Tests with the Twin Network

When running tests with the twin network, set the following environment variables:

```bash
# For Jest tests
export LIBRA_RPC_URL=http://127.0.0.1:THEPORT/v1  # Replace THEPORT with actual port
export TEST_ACCOUNT=9A710919B1A1E67EDA335269C0085C91
export TEST_TRANSACTION=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm test

# For Cypress tests
export CYPRESS_twinNetworkRpc=http://127.0.0.1:THEPORT/v1  # Replace THEPORT with actual port
export CYPRESS_testAccount=9A710919B1A1E67EDA335269C0085C91
export CYPRESS_testTransaction=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm run cypress:run
```

For more detailed information, see [TWIN-NETWORK-SETUP.md](docs/TWIN-NETWORK-SETUP.md).

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

## Data Flow Architecture

This application follows a clear, unidirectional data flow pattern that separates concerns between data fetching, state management, and UI rendering:

### Architectural Layers

1. **SDK Layer**: 
   - `SdkContext.tsx` - Initializes the blockchain connection and provides core SDK methods
   - `useSdk.ts` - Extends the SDK with utility methods and normalizes inputs/outputs

2. **Store Layer**:
   - Observable stores using LegendApp (`accountStore`, `blockchainStore`, `blockTimeStore`)
   - Stores maintain application state with well-defined actions for updates
   - Each store focuses on a specific domain (accounts, blockchain, metrics)

3. **Hook Layer**:
   - Custom hooks (`useAccount`, `useBlockchain`, `useBlockTime`) fetch data and update stores
   - Hooks handle lifecycle (initialization, polling, cleanup)
   - Provide loading states, error handling, and refresh mechanisms

4. **Component Layer**:
   - UI components observe stores and render data
   - Components don't fetch data directly; they consume it from stores via hooks
   - Specialized components focus on specific data views (metrics, transactions, accounts)

### Data Flow Pattern

```
Blockchain → SDK → Hooks → Stores → UI Components
              ↑        ↓         ↑
              └────────┴─────────┘
               (Bidirectional for
                refreshing data)
```

1. **Initialization**: SDK context connects to the blockchain on application start
2. **Data Fetching**: Hooks request data from the SDK and update stores
3. **Reactivity**: Stores notify components of state changes
4. **Rendering**: Components re-render with new data
5. **User Actions**: User triggers refresh → Hooks fetch new data → Cycle repeats

### Key Benefits

- **Separation of Concerns**: Data fetching logic is isolated from rendering logic
- **Consistent State Management**: All state changes flow through observable stores
- **Automatic UI Updates**: Components react to state changes without manual wiring
- **Optimized Performance**: Updates are granular and only affect relevant components
- **Maintainability**: Clear boundaries between layers make code easier to maintain

### Example Flow

When displaying account details:
1. `useAccount` hook fetches account data using the SDK
2. Account data is stored in `accountStore`
3. `AccountDetails` component observes the store and renders when data changes
4. User actions (refresh, change account) trigger the hook to fetch new data

This architecture ensures a consistent, maintainable approach to managing blockchain data throughout the application.

## Detailed Documentation

For more in-depth documentation about this project, explore the files in the `context-for-llm` directory:

- [Dependency Installation](context-for-llm/01-dependency-installation.md) - Details about package installation and initialization
- [Project Structure](context-for-llm/02-project-structure.md) - Comprehensive overview of project organization and architecture
- [Linting Corrections](context-for-llm/03-linting-corrections.md) - ESLint configuration and code quality standards
- [Test Summary](context-for-llm/04-test-summary.md) - Testing infrastructure and coverage
- [Build Summary](context-for-llm/05-build-summary.md) - Build process and output
- [Deployment Summary](context-for-llm/06-deployment-summary.md) - Deployment options and instructions
- [Future Updates](context-for-llm/07-future-updates.md) - Guidelines for maintaining and updating the project
- [Additional Features](context-for-llm/08-additional-features.md) - Comprehensive guide for extending the project
- [Change Request Template](context-for-llm/09-change-request-template.md) - Standard template for implementing changes following the data flow pattern

Additional documentation:
- [NativeWind CSS](docs/nativewind-css.md) - Details about CSS styling with NativeWind
- [PWA Implementation](docs/pwa-implementation.md) - Progressive Web App implementation details
- [Responsive Design](docs/responsive-design.md) - Guidelines for responsive design
- [Grid System](docs/grid-system.md) - Grid system usage
- [Layout](docs/layout.md) - Layout component documentation
- [Responsive Improvements](docs/responsive-improvements.md) - Recent responsive design improvements

## Adding New Features or Making Changes

When extending or modifying the OL Explorer, always follow these steps:

1. **Use the Change Request Template**: Start with the [Change Request Template](context-for-llm/09-change-request-template.md) to structure your changes. This template ensures you follow the project's established data flow pattern:
   ```
   SDK → SDK Context → Store → Hook → Component
   ```

2. **Follow the Implementation Guide**: Refer to the [Additional Features Guide](context-for-llm/08-additional-features.md) for detailed implementation patterns and best practices for:
   - Data persistence during refreshes
   - Component styling consistency
   - Observable state management
   - Error handling strategies
   - Memory management techniques

3. **Maintain the Architectural Pattern**: All modifications should maintain the unidirectional data flow architecture described in the [Data Flow Architecture](#data-flow-architecture) section.

Using these templates will ensure all code changes are consistent with the project's architecture and coding standards.

## Key Technologies

- **React Native & Expo**: Cross-platform mobile and web development
- **TypeScript**: Type-safe JavaScript
- **LegendApp/State**: Observable state management
- **NativeWind**: Tailwind CSS for React Native
- **Expo Router**: File-based routing
- **open-libra-sdk**: SDK for Open Libra blockchain interactions
- **Jest & React Testing Library**: Unit and integration testing
- **Cypress**: End-to-end testing

## Styling with NativeWind

The project uses NativeWind v4, a utility-first CSS framework for React Native based on Tailwind CSS, providing several advantages:

- **Utility-first approach**: Apply styling directly in component markup with className
- **Consistent design system**: Centralized theme definition in tailwind.config.js
- **Responsive design**: Breakpoint prefixes for different screen sizes
- **Dark mode support**: Built-in dark mode with utility classes

### Example Usage

```jsx
<View className="bg-background p-4 dark:bg-black">
  <Text className="text-white text-xl font-bold">Hello World</Text>
</View>
```

### Theme Configuration

The project's theme includes:

- **Colors**: Primary (`#E75A5C`), background (`#0B1221`), and more
- **Typography**: Custom font families including Inter and Geist Mono
- **Responsiveness**: Mobile-first with `md:` and other breakpoint prefixes

For more details on the NativeWind implementation, see [NativeWind CSS documentation](docs/nativewind-css.md).

## Deployment

### Web Deployment with Nginx

1. Set the appropriate RPC_URL in `src/config/sdkConfig.ts` for your target environment:
   ```typescript
   // In src/config/sdkConfig.ts
   const RPC_URL = 'https://production-rpc.openlibra.space:8080/v1';
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Copy the build to your server:
   ```bash
   scp -r web-build/* user@server:/var/www/ol-explorer/
   ```

4. Configure Nginx:
   ```nginx
   server {
       listen 80;
       server_name twin-explorer.openlibra.space;
       
       root /var/www/ol-explorer;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

5. Set up SSL with Certbot:
   ```bash
   sudo certbot --nginx -d twin-explorer.openlibra.space
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

> **Note:** The CI/CD pipeline is currently incomplete and under development. The complete implementation will include running all tests (both CLI and headless browser tests), spinning up a testnet instance before testing, and tearing it down afterward. This comprehensive test infrastructure is a work in progress.

The project uses GitHub Actions for continuous integration and deployment. The workflow:

1. Runs TypeScript type checking
2. Runs ESLint
3. Runs Jest tests
4. Runs Cypress tests
5. Deploys to staging on push to main branch
6. Can be manually promoted to production

## Configuration

### SDK Configuration

The main RPC URL is defined as a constant at the top of `src/config/sdkConfig.ts`:

```typescript
// Change this value to point to your preferred RPC endpoint
const RPC_URL = 'https://testnet-rpc.openlibra.space:8081/v1';
```

When deploying, modify this constant to point to your preferred RPC endpoint. The application uses a centralized configuration approach, so this is the only place you need to change the RPC URL.

The full SDK configuration is also in this file:

```typescript
export default {
  // RPC URL is determined from environment variables or falls back to default
  // See getRpcUrl() in sdkConfig.ts for the complete resolution logic
  // ... other SDK configuration options
};
```

### Environment Variables

For local development, create a `.env.local` file:

```
EXPO_PUBLIC_RPC_URL=https://your-rpc-endpoint.example/v1
```

The application will use the environment variable if available, or fall back to the default configuration.

### Running with Different Environments

For different deployment environments, you can:

1. **Development**: Use local environment variables
   ```bash
   EXPO_PUBLIC_RPC_URL=https://development-rpc.example/v1 npm run dev
   ```

2. **Staging**: Modify the RPC_URL constant or use build-time environment variables
   ```bash
   EXPO_PUBLIC_RPC_URL=https://staging-rpc.example/v1 npm run build
   ```

3. **Production**: For production deployments, directly edit the `RPC_URL` constant in `src/config/sdkConfig.ts` before building
   ```typescript
   const RPC_URL = 'https://production-rpc.openlibra.space:8080/v1';
   ```

This centralized approach ensures all components use the same RPC endpoint throughout the application.

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Open Libra team for their blockchain technology
- Expo team for their excellent React Native framework
- LegendApp team for their state management library

## Development

For detailed development guidelines, linting information, and testing procedures, please see the [Development Guide](DEVELOPMENT.md). 