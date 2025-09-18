#!/bin/bash

# Script to make PressWire.ie repository private and secure

echo "🔒 PressWire.ie Repository Security Script"
echo "========================================="
echo ""

# Check if GitHub CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI not authenticated. Please run: gh auth login"
    exit 1
fi

echo "⚠️  WARNING: This will make your repository PRIVATE"
echo "This is CRITICAL for protecting your intellectual property"
echo ""
read -p "Do you want to make the repository private? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted. Your repository remains PUBLIC and VULNERABLE."
    exit 1
fi

echo ""
echo "🔄 Making repository private..."

# Make repository private
if gh repo edit BuddySpuds/presswire-ie --visibility private; then
    echo "✅ Repository is now PRIVATE"
else
    echo "❌ Failed to make repository private"
    echo "Please do it manually at: https://github.com/BuddySpuds/presswire-ie/settings"
    exit 1
fi

echo ""
echo "📊 Current repository status:"
gh repo view BuddySpuds/presswire-ie --json visibility,isPrivate --jq '.visibility, .isPrivate'

echo ""
echo "✅ SUCCESS! Your code is now protected."
echo ""
echo "📝 Next steps:"
echo "1. Review FILES_TO_REMOVE.md for sensitive files"
echo "2. Consider creating a separate public marketing repo"
echo "3. Add copyright headers to all source files"
echo "4. Enable GitHub security alerts"
echo ""
echo "🔐 Your intellectual property is now safer!"