Functional Requirements (What the system must do)
Authentication & User Management
User Sign Up


The system shall allow users to create an account using name, email, and password.


The system shall validate email format and password rules.


The system shall store users locally.


User Login / Logout


The system shall allow registered users to log in using email and password.


The system shall keep the user logged in until logout.


The system shall allow users to log out and clear the session.


Session Guard


The system shall redirect unauthenticated users to the login page when they try to access protected pages (Dashboard, Trip, Globe).



Trip Management
Create Trip


The system shall allow a user to create a trip with:


title


start date


end date


description


optional cover image


Edit Trip


The system shall allow a user to edit any existing trip fields.


Delete Trip


The system shall allow a user to delete a trip.


Deleting a trip shall remove its locations and itinerary data.


List Trips


The system shall display all trips belonging to the logged-in user in the dashboard.



Locations Management
Add Location to Trip


The system shall allow a user to add locations to a trip with:


name/title


address/text location


latitude and longitude (from search)


View Locations


The system shall display all trip locations in a dedicated list.


Remove Location


The system shall allow a user to remove a location from a trip.


Search Locations


The system shall provide a search/autocomplete interface for selecting places.



Itinerary Management
Add Itinerary Item


The system shall allow users to add itinerary items with:


title


date


note/description


optional linked location


Edit/Remove Itinerary Item


The system shall allow editing and deleting itinerary items.


View Itinerary


The system shall display itinerary items grouped by day.



Map Features
Show Trip Map


The system shall display an interactive map for a trip.


The map shall show markers for all saved locations.


The map shall update markers after any add/remove.



Globe / Visited Countries
Detect Visited Countries


The system shall infer visited countries from trip locations.


Show Globe Visualization


The system shall display a 3D globe.


The globe shall highlight visited countries.


The globe shall update when trips change.


Persist Visited Countries


The system shall store visited countries per user locally.



Non-Functional Requirements (How well the system must work)
Usability
The system should be simple and intuitive for first-time users.


Major tasks (create trip, add location) should take no more than 3 clicks.


The UI should be consistent across pages.


Performance
The dashboard should load trips within 2 seconds under normal storage size.


The map should render within 3 seconds after opening a trip.


Globe visualization should remain interactive at >30 FPS on modern browsers.


Reliability & Data Integrity
The system shall not lose saved data unless the user clears browser storage.


The system shall save changes immediately after each action.


Data schema should be versioned to support future migrations.


Security (within a local-only app)
Passwords shall be stored as hashes (not plaintext).


The system shall require secure context (HTTPS/localhost) for hashing.


The system shall not expose any user password in UI or logs.


Compatibility
The system should work on modern browsers:


Chrome


Firefox


Edge


Safari


The system should be responsive for mobile, tablet, desktop.


Maintainability
Code should be modular (separate JS per page).


Reusable helper functions (auth/localStorage) should be centralized.


Adding a new page should not require editing unrelated modules.


Scalability (local constraints)
The system should handle at least:


100 trips


1,000 itinerary items total


with compressed cover images
 without breaking UI or exceeding storage easily.



Stakeholders (Who cares about this system)
Primary Stakeholders
End Users (Travelers)


People planning trips and tracking travel history.


Want easy trip creation, map view, and globe visualization.


Project Owner / Client


Whoever requested or sponsors Route360.


Cares about features meeting expected scope and quality.



Secondary Stakeholders
Developers / Maintainers


People who will fix bugs or add features later.


Need clean structure, clear data model, readable code.


Testers / QA


Validate correct behavior across pages and browsers.


Interested in stable flows and edge cases.


Demo/Presentation Audience (if academic or startup)


Judges, instructors, or investors.


Care about clarity, visuals (map/globe), and completeness.



Indirect/External Stakeholders
Third-Party Library Providers


Leaflet, globe.gl, world-atlas services.


Their stability affects your app.


Future Collaborators


People who might extend it into a backend version.


Need good documentation and flexible design.



Route360 Web — Project Documentation
1. Overview
Route360 Web is a front-end travel planning application that lets users:
Sign up / log in locally (no backend).


Create and manage trips (title, dates, description, cover image).


Add locations and itinerary items to a trip.


Visualize trip locations on an interactive map.


View a 3D globe of visited countries inferred from trips.


The app is built as a static multi-page web project where all data is persisted in the browser using localStorage. This makes it easy to run anywhere without a server, but also means data lives only on the user’s device.

2. Tech Stack
Core
HTML / CSS / Vanilla JavaScript for most pages.


React 18 (UMD via CDN) for the Globe page.


Leaflet.js for interactive maps in trip details.


three.js + globe.gl + d3-geo + topojson-client for the 3D globe.


Babel Standalone (in-browser JSX compilation for globe.jsx).


Persistence
Browser localStorage only. No external database.



3. Project Structure
Route360 web/
└── src/
    ├── Auth page/
    │   ├── auth.html
    │   └── auth.js
    ├── HomePage/
    │   ├── index.html
    │   └── style.css
    ├── Dashboard page/
    │   ├── dashboard.html
    │   ├── dashboard.js
    │   └── dashboard.css
    ├── trip page/
    │   ├── trip.html
    │   ├── trip.js
    │   └── trip.css
    ├── Globe Page/
    │   ├── globe.html
    │   ├── globe.js
    │   ├── globe.jsx
    │   └── globe.css
    └── Public/
        └── (images/assets)


4. How the App Works
Navigation Flow
HomePage (index.html)


Landing page branding + CTA.


Links to Auth.


Auth Page (auth.html)


User signup/login.


On success → redirect to Dashboard.


Dashboard (dashboard.html)


Lists all trips for current user.


Can create, edit, delete trips.


Clicking a trip card → Trip Details.


Trip Details (trip.html)


Trip overview, locations, and itinerary tabs.


Leaflet map view.


Actions persist back to storage.


Globe Page (globe.html)


3D globe showing visited countries.


Countries inferred from trips + optional manual marking.



5. Authentication & User Model
Storage Keys
route360_users
 Stores all registered users.


route360_currentUserId
 Stores the id of the logged-in user.


User Schema
{
  id: "user_1700000000000",
  name: "Jane Doe",
  email: "jane@mail.com",
  passwordHash: "<sha256>"
}

Security Notes
Passwords are hashed using SHA-256 via crypto.subtle.digest.


Works only on HTTPS or localhost because WebCrypto requires secure context.


This is client-side auth only; not production-secure, but fine for demos.


Global Helpers
auth.js exposes:
hashString


getAllUsers, saveAllUsers


getCurrentUserId, setCurrentUserId, clearCurrentUserId


getCurrentUser


Other pages rely on these functions.

6. Trips Data Model
Trips are stored per user.
Trip Storage Key
route360_trips_<userId>_v1

Trip Schema
{
  id: "trip_1700000000000",
  title: "Summer in Spain",
  start: "2025-06-01",
  end: "2025-06-10",
  desc: "Family trip to Barcelona and Madrid",
  coverDataUrl: "data:image/jpeg;base64,...",

  locations: [
    {
      id: "loc_1700000000000",
      title: "Barcelona, Spain",
      location: "Barcelona, Spain",
      lat: 41.3851,
      lng: 2.1734
    }
  ],

  itinerary: [
    {
      id: "it_1700000000000",
      title: "Sagrada Familia visit",
      date: "2025-06-02",
      note: "Book tickets early",
      day: 2
    }
  ]
}


7. Dashboard Page
Responsibilities
Auth guard: redirects to auth if no user session.


Load/save trips list.


Render trip cards with:


cover image


title


date range


action buttons (Edit/Delete)


Modal form for add/edit trip.


Notable Logic
Per-user naming stored as:

 route360_username_<userId>_v1


Image compression before saving cover image:


Resizes to max dimension.


Compresses progressively to keep localStorage safe.


Prevents storage overflow.



8. Trip Details Page
Responsibilities
Load trip by id from query params.


Provide tabbed UI:


Overview


Locations


Itinerary


Map


CRUD for:


Locations


Itinerary items


Persist changes immediately to storage.


Location Search
Uses a search/autocomplete UI (likely calling a public geocoding endpoint).


Selecting a place:


Adds to trip if targeting trip.


Or attaches location to an itinerary item.


Map Features
Leaflet map initialization.


Markers for:


Trip locations


Itinerary items with lat/lng


“Refresh markers” after any change.


Day Number Computation
When adding itinerary items, day number is derived from:
day = (date - trip.start) + 1

This enables per-day grouping.

9. Globe Page (Visited Countries)
Responsibilities
Auth guard.


Detect visited countries from trips.


Render a 3D globe with markers.


How Country Detection Works
Trips are scanned for countries using a predefined matching list.


Detected countries are merged with previously saved visited list.


Storage Key
route360_visitedCountries_<userId>_v1

Globes & Markers
Globe initialized once in useEffect.


Centroids for all countries loaded from:

 world-atlas@2/countries-110m.json


Markers shown for visited countries.



10. Running the Project
Because this is a static web app, you only need a static server.
Option A — VSCode Live Server
Open the project folder.


Right click HomePage/index.html → Open with Live Server.


App runs in browser.


Option B — Simple HTTP Server
From the root directory:
Python:
python -m http.server 8080

Visit:
http://localhost:8080/Route360 web/src/HomePage/index.html


11. Limitations
No backend


Data is only stored locally.


Users cannot sync across devices.


localStorage limits


App mitigates with cover compression.


Still possible to hit quota with many trips/images.


Security


Client-side hashing is not secure enough for real production.


No rate limiting or brute-force protection.


Geocoding dependency


If external geocoding API changes or throttles, search may fail.



12. Suggested Improvements / Roadmap
Short Term
Add input validation and better error UI.


Improve itinerary UI with time slots.


Better country detection (ISO mapping instead of string matching).


Medium Term
Move to a real backend (Firebase / Supabase / Node API).


Add cloud image storage.


Multi-device sync.


Long Term
Collaboration features:


shared trips


invite friends


Offline-first PWA mode.


Export itinerary to PDF/Calendar.



13. Developer Notes
Adding a New Page
Create folder under src/.


Add HTML + CSS + JS.


Ensure Auth guard if user-specific.


Storage Versioning
All keys are suffixed with _v1.
 If schema changes, bump version to _v2 and add migration logic.
Reusability
Auth helpers are globally attached to window, so any new page can do:
const userId = getCurrentUserId();
if (!userId) location.href = "auth.html";


14. Quick Reference
Key Pages
HomePage/index.html — Landing


Auth page/auth.html — Login + Signup


Dashboard page/dashboard.html — Trips list + CRUD


trip page/trip.html — Trip details + map + itinerary


Globe Page/globe.html — 3D visited globe


Key Storage
Users:


route360_users


route360_currentUserId


Trips per user:


route360_trips_<userId>_v1


Username per user:


route360_username_<userId>_v1


Visited countries per user:


route360_visitedCountries_<userId>_v1



If you want, I can also:
produce a polished GitHub-style README.md file version,


add diagrams (architecture + data flow),


or write API-style docs for each module/function.




