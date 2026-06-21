# Design QA

## 发起吊运

- Page: `src/pages-client/order/index.vue`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_10/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/order-final3-325x1600.png`
- Viewport: 325 x 1600

## Comparison

- Top bar, step tracker, payload panel, routing panel, protection panel, and fixed action bar align to the Stitch vertical structure.
- Key measured positions from local capture:
  - brand: x58 y14 w160 h23
  - payload panel: x12 y177 w302 h482
  - routing panel: x12 y675 w302 h381
  - protection panel: x12 y1073 w302 h410
  - action bar: x0 y1507 w325 h93
  - initiate button: x150 y1527 w163 h53
- Interaction check: tapping `INITIATE MISSION` navigates to `#/pages-client/match/index`.
- Runtime check: no console errors or page errors were captured.

## 保险理赔

- Page: `src/pages-client/insurance/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_1/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/client-insurance-pass1-319x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/client-insurance-compare-pass1.png`
- Viewport: 319 x 1600
- State: client insurance and claims center with static policy baseline before claim interaction

## Comparison

- SkyLink top bar, claims hero image, system-online chip, three KPI cards, insurance plan cards, current policy panel, claims timeline, and active Assets bottom navigation align to the Stitch long-page layout.
- The claims hero image was downloaded from the Stitch hosted URL into `src/static/stitch/insurance-claims-hero-source.png`.
- The page uses `src/components/StitchIcon.vue` Material Symbols for all Stitch icon names, including `assignment_late`, `diamond`, `agriculture`, `search`, and `upload_file`.
- Key measured positions from local capture:
  - topbar: x0 y0 w319 h52
  - hero: x14 y66 w292 h155
  - KPI grid: x14 y242 w292 h207
  - first plan card: x14 y497 w292 h130
  - current policies panel: x14 y1073 w292 h149
  - claims timeline panel: x14 y1243 w292 h231
  - bottom nav: x0 y1537 w319 h63
- Interaction check: tapping a plan card selects the plan; `VIEW ALL` gives feedback; `补充材料` creates/syncs the claim through the existing insurance flow; bottom `Home`, `Tasks`, `Wallet`, and `Profile` navigate to existing routes.
- Runtime check: loading and interaction captured no console errors or page errors.

## 智能匹配

- Page: `src/pages-client/match/index.vue`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_14/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/match-final2-390x987.png`
- Viewport: 390 x 987

## Comparison

- Top app bar, matching title, strategy pills, core solution card, fee accordion, and bottom action bar align to the Stitch mobile structure.
- The pilot avatar asset was downloaded from the Stitch hosted URL into `src/static/stitch/match-pilot-avatar.png`.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h66
  - brand: x70 y3 w99 h58
  - strategy row: x17 y153 w357 h41
  - solution card: x17 y223 w357 h487
  - cost card: x17 y730 w357 h60
  - action bar: x0 y901 w390 h86
  - confirm button: x163 y918 w210 h52
- Interaction check: tapping `确认下单` navigates to `#/pages-client/track/index`.
- Runtime check: loading the match page captured no console errors or page errors.

## 飞行监控

- Page: `src/pages-client/track/index.vue`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_13/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/track-route-fix5-294x800.png`
- Viewport: 294 x 800

## Comparison

- Top app bar, radar map, satellite map asset, route overlay, UAV tag, telemetry cards, mission phase card, and bottom action bar align to the Stitch mobile HUD structure.
- The satellite map asset was downloaded from the Stitch hosted URL into `src/static/stitch/flight-map.png`.
- The flight route was rebuilt as a transparent overlay in `src/static/stitch/flight-route.png` from the Stitch route path instead of CSS-spliced line segments.
- Key measured positions from local capture:
  - topbar: x0 y0 w294 h48
  - radar map: x12 y60 w271 h298
  - telemetry grid: x12 y370 w271 h228
  - first telemetry card: x12 y370 w131 h112
  - mission card: x12 y612 w271 h100
  - bottom action bar: x0 y724 w294 h76
  - refresh button: x153 y737 w130 h50
- Interaction check: tapping `Refresh Telemetry` starts the existing telemetry store and shows `Telemetry stream refreshed`.
- Runtime check: loading the track page captured no console errors or page errors.

## 评价结算

- Page: `src/pages-client/review/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign 2/_5/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/review-pass4-294x872.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/review-compare-pass4.png`
- Viewport: 294 x 872
- State: settled review form before submit

## Comparison

- Custom top navigation, page intro, settlement split card, completed settlement notice, rating card, comment field, counter, and fixed submit bar align to the Stitch mobile layout.
- The page uses `navigationStyle: custom` so H5 and mini-program do not insert a native title bar above the Stitch header.
- Key measured positions from local capture:
  - topbar: x0 y0 w294 h48
  - intro block: x12 y66 w270 h46
  - settlement card: x13 y136 w269 h342
  - rating card: x13 y497 w269 h232
  - bottom action bar: x0 y805 w294 h67
  - submit button: x13 y819 w269 h41
- Focused check: full-view comparison is readable at the target viewport; no separate crop was needed for text, counter, or button state.
- Interaction check: tapping a star changes the selected score; tapping `提交评价` calls the existing settlement/review store path and switches the button to `已提交评价`.
- Runtime check: loading and interaction captured no console errors or page errors.

## 设备管理

- Page: `src/pages-owner/drones/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign 2/_6/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/drones-pass2-390x1054.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/drones-compare-pass2.png`
- Viewport: 390 x 1054
- State: owner device compliance list

## Comparison

- Custom top navigation, owner role chip, compliance warning banner, four device cards, insurance grid, low-coverage warning state, and idle/running state copy align to the Stitch mobile layout.
- The page uses `navigationStyle: custom` so the Stitch header is the only visible navigation bar.
- The aircraft tile uses `src/static/stitch/device-plane.png`, a small transparent PNG asset, instead of the previous generic pointer icon.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h61
  - section header: x15 y89 w358 h26
  - info banner: x16 y178 w358 h79
  - first device card: x16 y279 w358 h185
  - second device card: x16 y482 w358 h183
  - low coverage card: x16 y681 w358 h202
  - fourth device card: x16 y901 w358 h202
- Focused check: icon tile, low-coverage amber strip, and `空闲可投放` wrapped state were readable in the full-view comparison; no separate crop was needed.
- Interaction check: tapping a device card shows the existing app feedback path as a toast.
- Runtime check: loading and interaction captured no console errors or page errors.

## 设备与资产

- Page: `src/pages-owner/devices/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_5/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/owner-devices-assets-pass3-404x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/owner-devices-assets-compare-pass3.png`
- Viewport: 404 x 1600
- State: owner fleet management with three asset cards

## Comparison

- SkyLink top bar, Fleet Management title, active/idle telemetry pills, three asset cards, deployed/idle/maintenance states, action buttons, and active Assets bottom navigation align to the Stitch mobile layout.
- The first asset background was downloaded from the Stitch hosted URL into `src/static/stitch/fleet-drone-fc30-source.png`.
- The page uses `src/components/StitchIcon.vue` Material Symbols for `person`, `signal_cellular_alt`, `query_stats`, `settings`, `build`, and the bottom navigation icons.
- Key measured positions from local capture:
  - topbar: x0 y0 w404 h67
  - status pills: x206 y164 w182 h44
  - first asset card: x17 y229 w371 h406
  - second asset card: x17 y652 w371 h406
  - third asset card: x17 y1074 w371 h406
  - bottom nav: x0 y1520 w404 h80
- Focused check: Material Symbols render as icons instead of visible icon names; second and third cards no longer inherit the first card image background.
- Interaction check: tapping `RECALL UNIT` calls the existing withdraw flow; tapping `DEPLOY CAPACITY` calls the existing deploy flow; telemetry/configuration icon buttons show explicit feedback; bottom `Home`, `Tasks`, `Wallet`, and `Profile` navigate to existing routes.
- Runtime check: loading and interaction captured no console errors or page errors.

## 机主管理台

- Page: `src/pages-owner/home/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_6/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/owner-home-pass7-660x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/owner-home-compare-pass7.png`
- Viewport: 390 x 945 at 660/390 DPR, matching the 660 x 1600 Stitch export
- State: owner asset operations dashboard with active Assets tab

## Comparison

- SkyLink top bar, owner avatar, asset operations KPI grid, guarantee KPI card, capacity pool stacked bar, horizontal device queue, floating auth/manage actions, and active Assets bottom navigation align to the Stitch mobile layout.
- The owner avatar was downloaded from the Stitch hosted URL and compressed into `src/static/stitch/owner-dashboard-avatar.png`.
- The page uses `src/components/StitchIcon.vue` Material Symbols for all Stitch icon names, including `flight`, `cell_tower`, `battery_charging_full`, `moving`, `power_off`, `verified_user`, and `settings`.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h64
  - KPI cards: x16 y136 w171 h141 and x203 y136 w171 h141
  - guarantee card: x16 y293 w358 h136
  - capacity pool card: x16 y453 w358 h166
  - device queue card: x16 y683 w280 h148
  - floating action panel: x16 y791 w358 h90
  - bottom nav: x0 y860 w390 h85
- Focused check: the `scroll-view` clipping issue on the horizontal device queue was removed by using a fixed overflow container; the first device card now exposes its title and telemetry area like the Stitch screenshot.
- Interaction check: top signal, active Assets tab, KPI cards, and pool segments show explicit feedback; `View All`, device cards, `补认证 (Auth)`, `管理设备 (Manage)`, `Tasks`, `Wallet`, and `Profile` route to existing app pages.
- Runtime check: loading and interaction captured no console errors or page errors.

## 信用风控

- Page: `src/pages/credit/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_3/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/credit-risk-pass3-706x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/credit-risk-compare-pass3.png`
- Viewport: 353 x 800 at 2x DPR, matching the 706 x 1600 Stitch export
- State: default client credit profile, score 956, Assets tab active

## Comparison

- SkyLink top bar, radar background panel, trust label, central credit score block, four dimension cards, and active Assets bottom navigation match the Stitch credit-risk screen structure.
- The radar background was downloaded from the hosted Stitch URL to `src/static/stitch/credit-radar-bg.jpg`; Material Symbols was regenerated as a 7.6KB icon-name subset including `verified_user`, `payments`, `handshake`, and `star_rate`.
- Key measured positions from local capture:
  - topbar: x0 y0 w353 h64
  - radar panel: x15 y79 w324 h263
  - score box: x90 y147 w174 h174
  - dimension cards: x15 y356 w324 h66, x15 y436 w324 h66, x15 y515 w324 h66, x15 y595 w324 h66
  - bottom nav: x0 y736 w353 h64
- Interaction check: tapping the score and dimension cards shows explicit credit feedback; `Tasks` navigates to `#/pages-client/order/index`; `Wallet` shows a role-aware fallback toast for the client role; `Profile` navigates to `#/pages/auth/index`.
- Runtime check: loading and interaction captured no console errors or page errors.

## 认证中心

- Page: `src/pages/auth/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_4/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/auth-center-pass4-467x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/auth-center-compare-pass4.png`
- Viewport: 467 x 1600
- State: certification materials step with default identity payload

## Comparison

- Custom top navigation, certification progress card, credential form card, identity upload cells, cargo category chips, credit authorization panel, and fixed submit action align to the Stitch mobile layout.
- The page uses `src/components/StitchIcon.vue` Material Symbols for the Stitch icon names, including `help_outline`, `linear_scale`, `verified`, `add_photo_alternate`, `inventory_2`, and `home_repair_service`.
- Key measured positions from local capture:
  - topbar: x0 y0 w467 h76
  - progress card: x20 y96 w427 h174
  - form card: x20 y308 w427 h1166
  - upload boxes: x51 y695 w173 h153 and x243 y695 w173 h153
  - cargo chips: x51 y1008 w103 h45, x167 y1008 w135 h45, x51 y1068 w119 h45, x183 y1068 w135 h45, x51 y1128 w103 h45
  - consent panel: x51 y1230 w365 h212
  - bottom action bar: x0 y1494 w467 h106
  - submit button: x19 y1515 w429 h68
- Focused check: Material icon sizes were corrected to match the Stitch HTML defaults; cargo chips keep the original 2+2+1 row layout.
- Interaction check: tapping help, upload, and authorization link shows explicit feedback; cargo chips toggle selection; the credit authorization checkbox toggles without being toggled again by the nested agreement link; `提交认证` calls the existing certification flow and shows inline submission feedback.
- Runtime check: loading and interaction captured no console errors or page errors.

## 运力调度

- Page: `src/pages-owner/dispatch/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_2/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/owner-dispatch-fontfix-396x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/owner-dispatch-fontfix-compare.png`
- Viewport: 396 x 1600
- State: owner capacity dispatch console with two real capacity units plus one returning fallback card

## Comparison

- SkyLink top bar, Capacity Dispatch title, two KPI cards, search/status/zone filter panel, New Dispatch CTA, three dispatch cards, mission progress rail, and active Tasks bottom navigation align to the Stitch mobile layout.
- The page uses `src/components/StitchIcon.vue` Material Symbols for all Stitch icon names, including `filter_list`, `radio_button_checked`, `keyboard_return`, and `undo`.
- Focused fix: Stitch's Inter, Hanken Grotesk, and JetBrains Mono fonts are embedded locally; `ACTIVE MISSIONS` and `75% UTILIZATION` are constrained to a single line and measured inside the KPI card with no right-edge overflow.
- Key measured positions from local capture:
  - topbar: x0 y0 w396 h68
  - KPI cards: x16 y183 w173 h114 and x206 y183 w173 h114
  - filter panel: x16 y315 w363 h133
  - first dispatch card: x16 y471 w363 h317
  - second dispatch card: x16 y804 w363 h340
  - third dispatch card: x16 y1160 w363 h317
  - bottom nav: x0 y1522 w396 h78
- Interaction check: tapping `Dispatch` calls the existing capacity online flow; tapping `Recall` calls the existing offline flow; `Ping`, `Details`, `Status`, and `Zone` provide explicit feedback; `New Dispatch`, `Home`, `Assets`, `Wallet`, and `Profile` navigate to existing routes.
- Runtime check: loading and interaction captured no console errors or page errors.

## 接单大厅

- Page: `src/pages-pilot/hall/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_9/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/hall-pass6-269x800.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/hall-compare-pass6.png`
- Viewport: 269 x 800
- State: pilot mission hall with three dispatch cards

## Comparison

- Top SkyLink app bar, Mission Hall heading, urgency sort button, urgent/standard mission cards, bounty blocks, metadata grids, tags, active status bar, and bottom navigation align to the Stitch mobile structure.
- The page uses `navigationStyle: custom` so the Stitch header is the only visible navigation bar.
- Key measured positions from local capture:
  - topbar: x0 y0 w269 h44
  - heading: x11 y60 w246 h28
  - sort button: x11 y101 w95 h24
  - urgent card: x11 y146 w247 h185
  - second card: x11 y342 w247 h163
  - third card: x11 y517 w247 h163
  - active status bar: x11 y709 w247 h39
  - bottom nav: x0 y748 w269 h52
- Focused check: card typography, tag rows, bottom status bar, and active tab are readable in the full-view comparison; no separate crop was needed.
- Interaction check: tapping a mission card accepts through the existing pilot order store and navigates to `#/pages-pilot/task/index`; tapping `Auto-Match` calls the existing demo-order generation path and shows feedback.
- Runtime check: loading the hall page captured no console errors or page errors; the click-through interaction surfaced one existing uni text-nesting warning from the destination task page.

## 任务执行

- Page: `src/pages-pilot/task/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_8/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/task-sweep-fix-300x800.png`
- Focused sweep crop: `/tmp/drone_v2_stitch_qa/task-sweep-fix-crop.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/task-compare-pass5.png`
- Viewport: 300 x 800
- State: pilot task cockpit HUD, visual settlement state

## Comparison

- Mission header, full-width radar map, downloaded map asset, transparent route overlay, tracking chip, target coordinate panel, settlement status pill, pre-flight checklist, telemetry grid, and fixed dual action bar align to the Stitch mobile cockpit structure.
- The map background was downloaded from the Stitch hosted URL into `src/static/stitch/task-map.png`.
- The dotted flight route was rebuilt as a transparent overlay in `src/static/stitch/task-route.png` so the curve scales with the radar map.
- The radar scanner sector was rebuilt as `src/static/stitch/task-sweep.png` to match the original teal sweep wedge inside the red-boxed map area.
- Key measured positions from local capture:
  - header: x0 y0 w300 h72
  - radar map: x0 y72 w300 h197
  - scan box: x76 y103 w147 h183
  - tracking chip: x203 y85 w87 h19
  - coordinate card: x12 y219 w174 h37
  - status pill: x68 y288 w165 h32
  - checklist panel: x12 y339 w276 h143
  - telemetry grid: x12 y502 w276 h211
  - bottom action bar: x0 y721 w300 h79
- Focused check: route curve, radar scanner, coordinate card, telemetry labels, and bottom action buttons are readable in the full-view comparison; no separate crop was needed.
- Interaction check: tapping a checklist row toggles its check state; tapping `DISPOSAL INST.` opens the existing disposal sheet; tapping the primary button still calls the existing task action path and shows inline feedback for the current no-active-task state.
- Runtime check: loading and interaction captured no console errors or page errors.

## 飞手驾驶舱

- Page: `src/pages-pilot/home/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_11/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/pilot-home-pass3-390x1017.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/pilot-home-compare-pass3.png`
- Viewport: 390 x 1017
- State: pilot dashboard with no active local task, dispatch fallback count

## Comparison

- SkyLink top bar, pilot avatar, scanline background, callsign hero, UPLINK status pill, advisory card, active waypoint card, power/dispatch cards, command action tiles, and bottom navigation align to the Stitch mobile dashboard structure.
- The pilot avatar was downloaded from the Stitch hosted URL and compressed into `src/static/stitch/pilot-dashboard-avatar.png`.
- The active mission background was downloaded into `src/static/stitch/pilot-dashboard-map.png`.
- The page uses `navigationStyle: custom` so the Stitch header is the only visible navigation bar.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h66
  - hero row: x17 y98 w357 h90
  - advisory card: x17 y209 w357 h120
  - mission card: x17 y347 w357 h203
  - stats grid: x17 y567 w357 h155
  - action grid: x17 y774 w357 h109
  - bottom nav: x0 y939 w390 h78
- Focused check: top signal bars, `Accept Orders` takeoff mark, active home grid icon, mission title, and bottom safe-area spacing are readable in the full-view comparison.
- Interaction check: tapping `Earnings` navigates to `#/pages-pilot/wallet/index`; tapping `Accept Orders` navigates to `#/pages-pilot/hall/index`; tapping the mission card falls back to the hall when there is no active task; tapping `Profile` shows the existing pilot identity toast.
- Runtime check: loading and interaction captured no console errors or page errors.

## 飞手钱包

- Page: `src/pages-pilot/wallet/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign/_7/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/pilot-wallet-pass3-390x1600.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/pilot-wallet-compare-pass3.png`
- Viewport: 390 x 1600
- State: pilot wallet overview with Stitch fallback financial telemetry when local wallet data is empty

## Comparison

- SkyLink top bar, Pilot Wallet heading, withdraw CTA, total revenue card, sparkline, four financial status cards, transaction ledger, and five-item bottom navigation align to the Stitch mobile wallet structure.
- The page uses `navigationStyle: custom` so the Stitch header is the only visible navigation bar.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h63
  - withdraw button: x16 y151 w213 h41
  - revenue card: x16 y215 w358 h214
  - metric grid: x16 y445 w358 h247
  - ledger card: x16 y724 w358 h788
  - bottom nav: x0 y1516 w390 h84
- Focused check: revenue title icon, ledger icon, active Wallet nav pill, and final ledger row clearance above the fixed nav are readable in the full-view comparison.
- Interaction check: tapping `Withdraw Funds` calls the existing wallet withdraw path and shows the no-balance guard when local wallet balance is empty; tapping pending settlement calls the existing release path; `Filter` and `Export` provide explicit feedback; bottom `Tasks`, `Assets`, and `Home` navigate to their existing routes.
- Runtime check: loading and interaction captured no console errors or page errors.

## 机主钱包

- Page: `src/pages-owner/wallet/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign 2/_1/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/owner-wallet-final-780x2260.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/owner-wallet-compare-final.png`
- Viewport: 390 x 1130, DPR 2
- State: owner wallet overview with Stitch fallback financial values when local owner wallet data is empty

## Comparison

- Custom top bar, dotted balance card, withdraw/bill actions, T+7 settlement card, ledger rows, dashed load-more button, and four-item bottom navigation align to the Stitch owner wallet reference.
- The page uses `navigationStyle: custom` so the Stitch header is the only visible navigation bar.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h64
  - balance card: x16 y80 w358 h216
  - pending card: x16 y316 w358 h215
  - ledger section: x16 y556 w358 h397
  - ledger rows: y613 h91, y717 h80, y809 h80
  - load more: x16 y911 w358 h42
  - bottom nav: x0 y1058 w390 h72
- Focused check: the source screenshot keeps the `monitoring` icon slot before `资金流水记录` but the glyph is not visible, so the implementation keeps the spacing and hides that single glyph while preserving the Stitch icon component in the DOM.
- Interaction check: top signal, withdraw, bill details, pending settlement, filter, first ledger row, load more, and active Assets tab all show explicit feedback; bottom Home, Tasks, and Profile navigate to their existing routes.
- Runtime check: loading and interaction captured no console errors or page errors.

## Stitch 图标来源修正

- Source check: the Stitch exports only contain `screen.png` and `code.html`; small icons are not exported as PNG/SVG files, they are Material Symbols names inside the HTML.
- Fix: added `src/components/StitchIcon.vue` and `src/static/fonts/material-symbols-outlined-subset.woff2`, a 15KB local Material Symbols subset generated from the icon names used by the restored Stitch pages.
- Updated pages: client home/order/match/track/review/insurance, owner dispatch/devices/drones, pilot home/hall/task/wallet, credit, and auth now use Stitch Material icon names instead of Wot icon substitutions or local CSS drawings.
- Runtime check: H5 screenshots confirmed `.stitch-icon` renders with `Material Symbols Outlined` and no icon-name text fallback on sampled pages.
- Build check: `dist/build/mp-weixin/static/fonts/material-symbols-outlined-subset.woff2` is present after `pnpm build:mp-weixin`.

## Verification

- `pnpm type-check`: passed
- `pnpm lint`: passed
- `pnpm build:mp-weixin`: passed

Notes: WeChat build still prints existing Sass and Wot UI deprecation warnings; they are not failures.

final result: passed

## 启动页

- Page: `src/pages/login/index.vue`
- Route config: `src/pages.json`
- Stitch source: `docs/stitch_modern_app_ui_redesign 2/_7/code.html`
- Stitch rendered reference: `/tmp/drone_v2_stitch_qa/launch-role-stitch-code-390x884.png`
- Local capture: `/tmp/drone_v2_stitch_qa/launch-role-final-390x884.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/launch-role-compare-final.png`
- Viewport: 390 x 884, DPR 2
- State: role-entry launch screen

## Comparison

- The exported `screen.png` for this item is a failed fetch marker, so the Stitch `code.html` was rendered locally and used as the visual reference.
- Blue atmospheric hero gradient, radar rings, brand row, demo environment pill, headline copy, three stat blocks, four role cards, and production-verification footer align to the Stitch launch screen structure.
- Key measured positions from local capture:
  - header: x16 y64 w358 h40
  - hero section: x16 y144 w358 h190
  - role list: x16 y374 w358 h385
  - first role card: x16 y374 w358 h82
  - admin role card: x16 y677 w358 h82
  - footer: x16 y812 w358 h41
- Focused check: role icons, mono labels, phone labels, chevrons, radar lines, and footer lock icon are readable in the full-view comparison; no Material icon text fallbacks were detected.
- Interaction check: Client, Pilot, Owner, and Admin cards route to `#/pages-client/home/index`, `#/pages-pilot/home/index`, `#/pages-owner/home/index`, and `#/pages-admin/index/index` respectively.
- Runtime check: loading and interaction captured no console errors or page errors.

## Verification

- `pnpm type-check`: passed
- `pnpm lint`: passed
- `pnpm build:mp-weixin`: passed

Notes: WeChat build still prints existing Sass and Wot UI deprecation warnings; they are not failures.

final result: passed

## 系统引导

- Page: `src/pages/index/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign 2/_4/screen.png`
- Stitch rendered reference: `/tmp/drone_v2_stitch_qa/system-guide-stitch-code-390x1635.png`
- Local capture: `/tmp/drone_v2_stitch_qa/system-guide-final-390x1635.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/system-guide-compare-final.png`
- Viewport: 390 x 1635, DPR 2
- State: system initialization guide before role selection

## Comparison

- The previous automatic launch redirect was replaced with the Stitch full-screen system initialization guide and an explicit `进入控制台` action.
- Dark technical grid background, scan-line overlay, blurred operational glow fields, brand mark, SkyLink Logistics heading, glass initialization card, telemetry panel, primary CTA, and build label align to the Stitch system guide structure.
- This page uses `navigationStyle: custom` so there is no native navigation bar over the Stitch full-screen layout.
- Key measured positions from local capture:
  - brand block: x16 y526 w358 h128
  - brand mark: x163 y526 w64 h64
  - initialization card: x16 y694 w358 h415
  - telemetry panel: x49 y830 w292 h113
  - primary button: x49 y975 w292 h56
- Focused check: flight mark, brand title, system copy, telemetry rows, `login` icon, and CTA are readable; no Material icon text fallbacks were detected.
- Interaction check: tapping `进入控制台` redirects to `#/pages/login/index`.
- Runtime check: loading and interaction captured no console errors or page errors.

## Verification

- `pnpm type-check`: passed
- `pnpm lint`: passed
- `pnpm build:mp-weixin`: passed

Notes: WeChat build still prints existing Sass and Wot UI deprecation warnings; they are not failures.

final result: passed

## 管理后台

- Page: `src/pages-admin/index/index.vue`
- Route config: `src/pages.json`
- Stitch source: `docs/stitch_modern_app_ui_redesign 2/_3/code.html`
- Stitch rendered reference: `/tmp/drone_v2_stitch_qa/admin-home-stitch-code-390x1100.png`
- Local capture: `/tmp/drone_v2_stitch_qa/admin-home-final-390x1100.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/admin-home-compare-final.png`
- Viewport: 390 x 1100, DPR 2
- State: admin mobile management home with KPI overview, audit queue, risk alert, and bottom navigation

## Comparison

- The exported `screen.png` for this item is a failed fetch marker, so the Stitch `code.html` was rendered locally and used as the visual reference.
- Fixed SkyLink top bar, operation overview header, SYSTEM ONLINE pill, two KPI cards, online fleet monitor, process drill tool card, audit queue rows, risk alert card, and four-item bottom navigation align to the Stitch mobile management backend structure.
- This page uses `navigationStyle: custom` so the Stitch top bar is the only visible navigation header.
- Key measured positions from local capture:
  - topbar: x0 y0 w390 h64
  - overview row: x16 y80 w358 h50
  - KPI grid: x16 y155 w358 h260
  - fleet card: x16 y314 w358 h101
  - tool card: x16 y476 w358 h77
  - audit section: x16 y573 w358 h190
  - risk card: x16 y824 w358 h143
  - risk title: x68 y841 w289 h21
  - bottom nav: x0 y1023 w390 h77
- Focused check: Material icon glyphs, KPI numbers, fleet progress, queue badges, audit buttons, risk warning triangle, and active Home tab are readable in the full-view comparison; no Material icon text fallbacks were detected.
- Interaction check: brand, signal, online pill, KPI cards, fleet card, flow tool, audit badge, audit buttons, risk card, risk actions, and all bottom navigation entries navigate or show explicit feedback.
- Runtime check: loading and interaction captured no console errors or page errors.

## Verification

- `pnpm type-check`: passed
- `pnpm lint`: passed
- `pnpm build:mp-weixin`: passed

Notes: WeChat build still prints existing Sass and Wot UI deprecation warnings; they are not failures.

final result: passed

## 运营控制台

- Page: `src/pages-admin/dashboard/index.vue`
- Route config: `src/pages.json`
- Stitch reference: `docs/stitch_modern_app_ui_redesign 2/_2/screen.png`
- Local capture: `/tmp/drone_v2_stitch_qa/op-console-final-1600x1280.png`
- Full-view comparison: `/tmp/drone_v2_stitch_qa/op-console-compare-final.png`
- Viewport: 1600 x 1280
- State: desktop operations command console with Stitch fallback telemetry when local admin data is empty

## Comparison

- Fixed 80px topbar, 300px left navigation rail, 1220px content canvas, KPI row, map operations panel, authentication queue, live load chart, and high-risk order card align to the Stitch desktop operations console reference.
- The operator avatar was downloaded from the Stitch hosted URL, compressed, and saved as `src/static/stitch/op-console-avatar.png`.
- The operations/map image was downloaded from the Stitch hosted URL, compressed, and saved as `src/static/stitch/op-console-map.png`.
- The Material Symbols local subset was regenerated with the Stitch icon names currently used by the restored pages and saved as `src/static/fonts/material-symbols-outlined-subset.ttf`; `src/uni.scss` now loads that TTF before the older WOFF2 fallback.
- Key measured positions from local capture:
  - topbar: x0 y0 w1600 h80
  - rail: x0 y80 w300 h1200
  - page head: x340 y120 w1220 h111
  - KPI row: x340 y261 w1220 h177
  - map panel: x340 y468 w803 h500
  - authentication queue: x1173 y468 w387 h500
  - queue footer: x1174 y927 w385 h40
  - live load chart: x340 y998 w803 h330
  - high-risk order card: x1173 y998 w387 h220
- Focused check: topbar icon glyphs, left rail active state, KPI labels, map controls, queue footer, chart bars, and risk-action controls are readable in the full-view comparison; no Material icon text fallbacks were detected.
- Interaction check: notification, settings, operator profile, sidebar modules, export, process drill, KPI card, map zoom controls, queue reject/review, queue footer, risk actions, and chart range selector all navigate or show explicit feedback.
- Runtime check: loading and interaction captured no console errors or page errors.

## Verification

- `pnpm type-check`: passed
- `pnpm lint`: passed
- `pnpm build:mp-weixin`: passed

Notes: WeChat build still prints existing Sass and Wot UI deprecation warnings; they are not failures.

final result: passed
