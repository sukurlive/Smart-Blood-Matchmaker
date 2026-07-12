# SmartBloodMatchMaker 🩸

Aplikasi mobile yang menghubungkan donor darah dengan rumah sakit dan pasien yang membutuhkan secara cerdas. Menggunakan teknologi AI untuk memberikan rekomendasi matching donor darah berdasarkan kompatibilitas dan lokasi geografis secara real-time.

## 📋 Daftar Isi
- [Penjelasan Singkat](#penjelasan-singkat)
- [Tech Stack](#tech-stack)
- [Fitur Utama](#fitur-utama)
- [Application Flow](#application-flow)
- [Instalasi](#instalasi)
- [Penggunaan](#penggunaan)

## Penjelasan Singkat

SmartBloodMatchMaker adalah platform mobile yang memfasilitasi proses donasi darah dengan mencocokkan donor dan penerima secara otomatis menggunakan algoritma AI. Aplikasi ini memudahkan rumah sakit untuk menemukan donor yang sesuai dan donor untuk berkontribusi menyelamatkan nyawa dengan sistem yang aman, efisien, dan terdesentralisasi.

## Tech Stack

### Frontend
- **Framework**: React Native dengan Expo (cross-platform: iOS, Android, Web)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **UI Components**: React Native dengan custom theming
- **State Management**: React Context API

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time Updates**: Supabase Realtime
- **File Storage**: Supabase Storage

### AI & Recommendations
- **Blood Matching Algorithm**: Custom AI recommendation engine
- **Integration**: OpenAI API untuk insights dan chat support
- **Geolocation**: Geolib + Expo Location untuk proximity matching

### Additional Libraries
- **Maps**: React Native Maps
- **Notifications**: Expo Notifications
- **Storage**: Async Storage
- **Haptics**: Expo Haptics untuk user feedback

## Fitur Utama

### 👥 Untuk Donor
- **Registrasi & Profil**: Kelola data pribadi, tipe darah, dan histori donasi
- **Pencarian Permintaan**: Lihat permintaan darah dari rumah sakit terdekat
- **Smart Matching**: AI merekomendasikan permintaan yang paling sesuai berdasarkan kompatibilitas
- **Forum Diskusi**: Berkomunikasi dengan komunitas donor dan rumah sakit
- **Histori Donasi**: Track semua aktivitas donasi dengan detail

### 🏥 Untuk Rumah Sakit
- **Dashboard Hospital**: Pantau stok darah dan permintaan
- **Buat Permintaan**: Post kebutuhan darah dengan detail pasien
- **Smart Donor Matching**: Sistem AI otomatis menemukan donor terbaik
- **Manajemen Request**: Track status permintaan dari awal hingga selesai
- **Analytics**: Laporan dan statistik donasi

### 👨‍💼 Untuk Admin
- **Admin Dashboard**: Kelola pengguna, verified status, dan sistem
- **Request Management**: Approve/reject permintaan donor dan rumah sakit
- **User Analytics**: Monitoring aktivitas dan metrik sistem
- **Forum Moderation**: Kelola konten di forum diskusi

## 📸 Screenshot Showcase

| | | |
|:-:|:-:|:-:|
| ![Login Screen](./images/ss1_login.png) | ![Home Dashboard](./images/ss2_home.png) | ![Forum Discussion](./images/ss5_forum.png) |
| ![Blood Request](./images/ss3_blood_request.png) | ![Profile Management](./images/ss4_profile.png) | ![History Donation](./images/ss6_history.png) |

## Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ENTRY POINT                          │
│                    (Auth Flow)                               │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──► [Registrasi] ──► [Set Profil] ──► [Verifikasi]
             │
             └──► [Login] ──► [Dashboard]
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
    [DONOR]                  [HOSPITAL]                   [ADMIN]
         │                          │                          │
         ├─ Home/Dashboard          ├─ Hospital Dashboard      ├─ Admin Dashboard
         │  ├─ View Profile         │  ├─ Create Request       │  ├─ User Management
         │  ├─ AI Matching          │  ├─ View Requests        │  ├─ Approve/Reject
         │  ├─ Accept Request       │  ├─ Donor Matching       │  ├─ Analytics
         │  ├─ Forum Donor          │  ├─ Manage Inventory     │  └─ Moderation
         │  ├─ History              │  └─ Analytics            │
         │  └─ Edit Profile         │                          │
         │                          └─ Admin Requests          │
         │                                                      │
         └──────────────────┬───────────────────────────────────┘
                            │
                     ┌──────▼────────┐
                     │  AI Engine    │
                     │  - Blood Type │
                     │  - Proximity  │
                     │  - Availability
                     │  - History    │
                     └───────────────┘
                            │
                     ┌──────▼────────┐
                     │  Supabase     │
                     │  Database     │
                     │  (Realtime)   │
                     └───────────────┘
```

### Workflow Utama:

1. **User Registration**: Donor/Hospital/Admin mendaftar dan verifikasi
2. **Profile Setup**: Lengkapi data profil dan informasi kesehatan
3. **Request Creation**: Hospital membuat request darah
4. **AI Matching**: Sistem merekomendasikan donor compatible
5. **Notification**: Donor notifikasi untuk request sesuai
6. **Acceptance**: Donor accept dan schedule appointment
7. **Completion**: Darah dikumpulkan dan histori updated
8. **Feedback**: Review dan rating dari kedua belah pihak

## Instalasi

### Prerequisites
- Node.js v18+ dan npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator atau Android Emulator (atau Expo Go app)

### Setup Steps

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd SmartBloodMatchMaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # Copy .env.local dan isi dengan credentials
   cp .env.local.example .env.local
   ```
   
   Update file `.env.local`:
   ```
REACT_APP_SUPABASE_URL=[url]
REACT_APP_SUPABASE_PUBLISHABLE_KEY=[published_key]

DATABASE_URL = postgresql://postgres.jggwwcxutxzbanqkujwk:[Password]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres   
```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open in emulator/simulator**
   - iOS: Press `i`
   - Android: Press `a`
   - Web: Press `w`
   - Expo Go: Scan QR code dengan app Expo Go

## Penggunaan

### Development
```bash
# Start Expo development server
npm start

# Start dengan specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser

# Lint code
npm run lint
```

### Project Structure
```
app/                    # Application pages & routes
├── (tabs)/            # Main tab navigation
├── index.tsx          # Entry point
├── register.tsx       # Registration
└── modal.tsx          # Modal screens

components/           # Reusable components
├── ui/               # Basic UI components
└── themed-*          # Themed components

contexts/             # React Context (State Management)
├── AuthContext.tsx   # Authentication context

hooks/                # Custom React hooks
├── use-blood-agent.ts # AI blood matching

constants/            # App constants
└── theme.ts         # Theme configuration

supabase.ts          # Supabase client setup
```

## API Integration

### Supabase
- Authentication & User management
- Real-time database updates
- Blood request & donor matching data

### OpenAI
- Blood matching recommendations
- Chat-based support
- Data insights & analytics

## Kontribusi

Silakan fork repository dan buat pull request untuk fitur baru atau bug fixes.

## License

Proprietary - SmartBloodMatchMaker © 2024
