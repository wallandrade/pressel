# Project Walkthrough: Pressel Layout & Design Updates

This document summarizes the changes made to the "Pressel" project to fix layout issues, synchronize designs, and update tracking codes.

## 🎯 Key Objectives Achieved

1.  **Layout Fixes**: Resolved the issue where the main card was "moving" or not centered.
2.  **Design Synchronization**: Matched the Main Page design to the WhatsApp Page design.
3.  **Content Configuration**:
    *   **Main Page (`/pressel/`)**: Configured for **Group Invite**.
    *   **WhatsApp Page (`/pressel/whatsapp/`)**: Configured for **Personal WhatsApp**.
4.  **Facebook Pixel**: Updated the tracking code on the WhatsApp page.

## 🛠️ Technical Changes

### 1. Layout Stabilization
- **Problem**: The background animation was causing the layout to shift, and flexbox centering was inconsistent.
- **Solution**: 
    - Switched `body` to use **CSS Grid** (`display: grid; place-items: center`) for robust centering.
    - Changed `.background-glow` to **`position: fixed`** with `100%` width/height to stop movement.
    - Added `overflow-x: hidden` to prevent horizontal scrolling.
    - Added `?v=1.1` to the CSS link to force a cache refresh.

### 2. File Updates

#### `index.html` (Main Page)
- **Structure**: Overwritten with the cleaner structure from `/whatsapp/index.html`.
- **Content**:
    - **Title**: "Grupo VIP"
    - **Button**: "ENTRAR NO GRUPO"
    - **Link**: WhatsApp Group URL
- **Styling**: References `style.css` (rooted).

#### `style.css` (Main Styles)
- **Synced**: content matched to `whatsapp/style.css` but with the **grid centering fix** applied.
- **Background**: Fixed position, no rotation animation.

#### `whatsapp/index.html` (Sub-page)
- **Structure**: Kept original structure.
- **Content**:
    - **Title**: "Atendimento VIP"
    - **Button**: "CHAMAR NO WHATSAPP"
    - **Link**: Personal WhatsApp URL (`wa.me/...`)
- **Tracking**: 
    - Updated Facebook Pixel code to ID `1626935762075878`.
    - Added **Manual Event Tracking**: `onclick="fbq('track', 'Lead')"` on the button to ensure events are captured even if the automatic tool fails.

## 🚀 Deployment Status

All changes have been committed and pushed to the `main` branch.
- **Repository**: `origin main`
- **Latest Commit**: Updated Pixel and Design Sync.

### Production URL Note
If deploying on Vercel from the repository root, the URL is likely:
> `https://schutz-oferta.com/` (for the main page)
> `https://schutz-oferta.com/whatsapp/` (for the WhatsApp page)

*(Accessing `/pressel` usually results in 404 unless the project structure is changed)*.
