# TVYCAP_UHI - React Native Application

## Project Overview

TVYCAP_UHI is a React Native mobile application for UHI (Urban Heat Island) monitoring and data collection. The app interfaces with IoT sensors via Bluetooth Low Energy (BLE) to collect environmental data and manages data storage using AWS S3.

---

## Tech Stack

### Core Technologies
- **React Native** - Cross-platform mobile development
- **Expo** - React Native framework and tooling
- **JavaScript** - Primary programming language

### Key Libraries & Services
- **Bluetooth Low Energy (BLE)** - Sensor communication
- **AWS S3** - Cloud data storage
- **React Navigation** - App navigation (inferred from screen components)

### Development Tools
- **npm** - Package management
- **Metro** - JavaScript bundler
- **EAS (Expo Application Services)** - Build and deployment

---

## Project Structure

```
dwsTVYCAP_UHI/
├── assets/               # Static assets (images, sounds, icons)
│   ├── adaptive-icon.png
│   ├── alarm.wav
│   ├── favicon.png
│   ├── icon.png
│   ├── sensorImage2.png
│   ├── splash-icon.png
│   └── splash.png
├── utils/                # Utility modules
│   ├── blePermissions.js
│   └── bleState.js
├── AppPart0.js          # Main app component (current version)
├── AppPart0HOLD.js      # Archived version
├── AppPart1.js          # App component variant
├── LocationTestScreen.js # Location testing screen
├── MainScreen1.js       # Primary main screen
├── MainScreen1BACKUP.js # Backup of main screen
├── Settings1.js         # Settings screen
├── constants.js         # App-wide constants
├── credentials.json     # AWS/service credentials (should be .gitignored)
├── functions.js         # Core utility functions
├── functionsHOLD.js     # Archived functions
├── functionsHelper.js   # Helper utilities
├── functionsS3.js       # S3-specific functions
├── s3_util.js          # S3 utilities
├── index.js            # App entry point
├── app.json            # Expo configuration
├── eas.json            # EAS build configuration
├── package.json        # Dependencies and scripts
├── metro.config.js     # Metro bundler configuration
└── README.md           # Project documentation
```

---

## Development Guidelines

### Code Organization
- **Screen components** should be in PascalCase (e.g., `MainScreen1.js`, `Settings1.js`)
- **Utility functions** should be in camelCase files (e.g., `functions.js`, `blePermissions.js`)
- **Keep backup files** with `BACKUP` or `HOLD` suffix for version tracking

### Naming Conventions
- Components: PascalCase (e.g., `LocationTestScreen`)
- Functions: camelCase (e.g., `handleSensorData`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINT`)
- Files: Match the primary export name

### BLE & Sensor Integration
- All BLE permissions handling should go through `utils/blePermissions.js`
- BLE state management should use `utils/bleState.js`
- Sensor-specific logic should be modular and testable

### AWS S3 Integration
- Use `functionsS3.js` for S3 operations
- Keep credentials in `credentials.json` (ensure it's in `.gitignore`)
- Handle errors gracefully with user-friendly messages

### Testing
- Test location services using `LocationTestScreen.js`
- Verify BLE functionality on physical devices (BLE doesn't work in simulators)
- Test offline scenarios and data sync

---

## Git Workflow & Branching Strategy

### Branch Naming Convention

**IMPORTANT**: All new features and fixes should be developed in dedicated branches using this format:

```
fix/<descriptive-name>      # For bug fixes
feature/<descriptive-name>  # For new features
```

**Examples**:
- `fix/ble-connection-timeout`
- `fix/s3-upload-error-handling`
- `feature/dark-mode`
- `feature/data-export`

### Creating a New Branch

```bash
# Make sure you're on main and it's up to date
git checkout main
git pull origin main

# Create and switch to a new feature/fix branch
git checkout -b fix/descriptive-name
# or
git checkout -b feature/descriptive-name

# Push the new branch to remote
git push -u origin fix/descriptive-name
```

### Standard Development Workflow

```bash
# 1. Start from updated main
git checkout main
git pull origin main

# 2. Create feature/fix branch
git checkout -b fix/sensor-data-parsing

# 3. Make your changes and commit frequently
git add .
git commit -m "Fix sensor data parsing for temperature values"

# 4. Push to remote
git push origin fix/sensor-data-parsing

# 5. When complete, merge into main (or create PR on GitHub)
git checkout main
git pull origin main
git merge fix/sensor-data-parsing
git push origin main

# 6. Delete the branch locally and remotely (optional, after merge)
git branch -d fix/sensor-data-parsing
git push origin --delete fix/sensor-data-parsing
```

### Before Making Changes
- Always create a new `fix/` or `feature/` branch
- Never commit directly to `main`
- Keep commits atomic and well-described
- Test thoroughly before merging to main

---

## AI Assistant (Claude Code) Instructions

### General Guidelines

When helping with this project:

1. **Always work in a feature/fix branch**
   - Before making ANY code changes, create a branch: `git checkout -b fix/issue-name` or `git checkout -b feature/new-feature`
   - Never make changes directly to `main`
   - Push the branch to remote: `git push -u origin branch-name`

2. **Understand the context**
   - This is a React Native/Expo app for environmental monitoring
   - It uses BLE for sensor communication
   - It stores data in AWS S3
   - Users are field researchers collecting UHI data

3. **Code quality standards**
   - Write clear, commented code
   - Follow existing naming conventions
   - Handle errors gracefully with user feedback
   - Consider offline scenarios
   - Test on actual devices when dealing with BLE or location services

4. **File modifications**
   - Keep backup versions before major refactors (e.g., `ComponentNameBACKUP.js`)
   - Update `package.json` if adding new dependencies
   - Update `app.json` or `eas.json` if changing app configuration

5. **Security considerations**
   - Never commit `credentials.json` with real credentials
   - Use environment variables for sensitive data
   - Sanitize user inputs
   - Handle permissions properly (BLE, location, storage)

### Typical Tasks

**Adding a new feature:**
```bash
git checkout main
git pull origin main
git checkout -b feature/feature-name
# Make changes
git add .
git commit -m "Add feature: description"
git push origin feature/feature-name
```

**Fixing a bug:**
```bash
git checkout main
git pull origin main
git checkout -b fix/bug-description
# Make changes
git add .
git commit -m "Fix: bug description"
git push origin fix/bug-description
```

**Updating dependencies:**
```bash
git checkout -b fix/update-dependencies
npm update
# Test thoroughly
git add package.json package-lock.json
git commit -m "Update dependencies"
git push origin fix/update-dependencies
```

### When Asked to Make Changes

1. **First**: Confirm which branch to work in or create a new `fix/` or `feature/` branch
2. **Then**: Make the requested changes
3. **Finally**: Provide clear instructions on:
   - What was changed
   - How to test it
   - What to do next (merge, test on device, etc.)

### Testing Reminders

- **BLE features**: Must test on physical device
- **Location features**: Test with actual GPS data
- **S3 uploads**: Verify with AWS console
- **Permissions**: Test on fresh install
- **Offline mode**: Disconnect from network and test

### Common Commands Reference

```bash
# Check current branch
git branch --show-current

# See all branches
git branch -a

# Create new branch
git checkout -b fix/branch-name

# Switch branches
git checkout branch-name

# See what changed
git status
git diff

# Commit changes
git add .
git commit -m "Description"

# Push to remote
git push origin branch-name

# Update from main
git checkout main
git pull origin main
```

---

## Running the Application

### Development

```bash
# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

### Building

```bash
# Build for iOS (requires EAS)
eas build --platform ios

# Build for Android
eas build --platform android
```

---

## Important Notes

⚠️ **Critical Reminders**:
- `credentials.json` should NEVER be committed with real credentials
- BLE features require physical devices for testing
- Always test location services with real GPS data
- S3 operations should handle network failures gracefully
- **All development work should be done in `fix/` or `feature/` branches**

📝 **Documentation**:
- Keep this `claude.md` file updated as the project evolves
- Document major architectural decisions
- Update README.md for user-facing documentation

🔄 **Branching Workflow**:
- `main` - Production-ready code
- `fix/*` - Bug fixes and corrections
- `feature/*` - New features and enhancements
- Version branches (e.g., `V4.2.1`) - Release versions

---

## Contact & Resources

- **Project Repository**: https://github.com/donsweeney4/tvycap_uhi.git
- **Expo Documentation**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **AWS S3 SDK**: https://docs.aws.amazon.com/sdk-for-javascript/

---

**Last Updated**: January 2026
**Current Version**: V4.2.1
