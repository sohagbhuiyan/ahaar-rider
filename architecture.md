# AHAAR Rider App & Delivery System Architecture

The complete, authoritative technical architecture specification is maintained in [`docs/architecture.md`](./docs/architecture.md).

### Quick Summary
- **Backend:** Laravel 12 API with MySQL as single source of truth.
- **Rider App:** Expo SDK 57 / React Native 0.86 / NativeWind 4.
- **Car Track:** Multi-stop subscription catering runs (`delivery_runs` -> `daily_deliveries`).
- **Bike Track:** Point-to-point instant orders (`orders`).
- **Package ID:** Thermal adhesive labels with tamper-evident QR codes + bold human-readable sequence tags.
- **Delivery Confirmation:** Free Photo Proof-of-Delivery + Geo-fencing (Zero SMS fees).
