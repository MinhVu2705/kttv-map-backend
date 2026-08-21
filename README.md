# kttv-map-backend

Sinh lop raster (nhiet do + mua) cho ban do noi suy cua app "Thoi tiet Viet Nam",
chay hoan toan mien phi tren GitHub Actions + GitHub Pages.

## Cach hoat dong

Moi 15 phut, GitHub Actions:
1. Fetch du lieu that tu API diem cua KTTV (18x11 = 198 diem, xem `src/generate.ts`).
2. Noi suy IDW ra luoi day hon (xem `src/interpolate.ts`, port nguyen tu app mobile).
3. Raster hoa ra `temp.png` + `rain.png` bang pngjs (thuan JS, khong can build native).
4. Publish `output/` len branch `gh-pages` -> GitHub Pages serve mien phi qua CDN.

App mobile chi can fetch:
```
https://<user>.github.io/kttv-map-backend/temp.png
https://<user>.github.io/kttv-map-backend/rain.png
https://<user>.github.io/kttv-map-backend/meta.json
```
va overlay len ban do bang toa do trong `meta.json.bounds` (thay vi tu fetch+noi
suy trong WebView nhu truoc).

## Setup lan dau

1. Tao repo GitHub moi, **de public** (bat buoc de Actions minutes va Pages mien phi
   khong gioi han - xem giai thich trong lich su trao doi thiet ke).
2. Push code nay len repo do.
3. Vao Settings -> Secrets and variables -> Actions, them (khong bat buoc, co gia
   tri mac dinh trung voi app mobile neu bo qua):
   - `KTTV_API_BASE_URL`
   - `KTTV_API_CLIENT_ID`
   - `KTTV_API_SECRET_KEY`
4. Vao Settings -> Pages, chon Source = "Deploy from a branch", branch = `gh-pages`, thu muc `/ (root)`.
5. Vao tab Actions, chay workflow "Generate weather map raster" thu cong lan dau
   (nut "Run workflow") de tao branch `gh-pages` va kiem tra output dung.

## Chay thu local

```
npm install
npm run generate
```
Output nam o `output/temp.png`, `output/rain.png`, `output/meta.json`.
