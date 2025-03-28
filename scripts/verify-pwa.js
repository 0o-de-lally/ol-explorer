/**
 * PWA Verification Script
 * This script checks your project to ensure all necessary PWA files and settings are in place
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); // You'll need to add this dependency if you want to use it

// Define required files for PWA
const requiredFiles = [
    { path: 'public/manifest.json', name: 'Web App Manifest' },
    { path: 'public/service-worker.js', name: 'Service Worker' },
    { path: 'public/logo192.png', name: 'Small App Icon (192x192)' },
    { path: 'public/logo512.png', name: 'Large App Icon (512x512)' }
];

// Define manifest requirements
const manifestRequirements = [
    { key: 'name', description: 'App name' },
    { key: 'short_name', description: 'Short app name' },
    { key: 'icons', description: 'App icons array' },
    { key: 'start_url', description: 'Start URL' },
    { key: 'display', description: 'Display mode' },
    { key: 'theme_color', description: 'Theme color' },
    { key: 'background_color', description: 'Background color' }
];

// Check for required files
console.log('🔍 Verifying PWA assets and configuration...\n');

// Check each required file
let missingFiles = 0;
requiredFiles.forEach(file => {
    const filePath = path.resolve(process.cwd(), file.path);

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
            console.log(`✅ ${file.name}: Found`);
        } else {
            console.log(`⚠️ ${file.name}: Found but appears to be empty`);
            missingFiles++;
        }
    } else {
        console.log(`❌ ${file.name}: Missing`);
        missingFiles++;
    }
});

// Check manifest.json content if it exists
const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log('\n📋 Checking manifest.json properties:');

        let missingProps = 0;
        manifestRequirements.forEach(req => {
            if (manifest[req.key]) {
                console.log(`✅ ${req.description}: Found`);
            } else {
                console.log(`❌ ${req.description}: Missing`);
                missingProps++;
            }
        });

        if (missingProps === 0) {
            console.log('\n✅ manifest.json contains all required properties');
        } else {
            console.log(`\n⚠️ manifest.json is missing ${missingProps} required properties`);
        }

    } catch (error) {
        console.log('\n❌ Error parsing manifest.json:', error.message);
    }
}

// Check HTML for required PWA meta tags
const indexPath = path.resolve(process.cwd(), 'public/index.html');
if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    console.log('\n🔍 Checking index.html for PWA-related tags:');

    const tagsToCheck = [
        { regex: /<link[^>]*rel=["']manifest["'][^>]*>/i, name: 'manifest link' },
        { regex: /<meta[^>]*name=["']theme-color["'][^>]*>/i, name: 'theme-color meta tag' },
        { regex: /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/i, name: 'apple-touch-icon link' },
        { regex: /<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*>/i, name: 'apple-mobile-web-app-capable meta tag' }
    ];

    tagsToCheck.forEach(tag => {
        if (tag.regex.test(html)) {
            console.log(`✅ ${tag.name}: Found`);
        } else {
            console.log(`❌ ${tag.name}: Missing`);
        }
    });
}

// Print summary
console.log('\n📊 PWA Verification Summary:');
if (missingFiles === 0) {
    console.log('✅ All required PWA files are present');
} else {
    console.log(`⚠️ ${missingFiles} required PWA files are missing or empty`);
}

// Service worker registration check suggestion
console.log('\n💡 Remember to check that the service worker is being registered in your application code.');
console.log('   Look for a call to registerServiceWorker() in your main application file.');

console.log('\n🎉 PWA verification complete!'); 