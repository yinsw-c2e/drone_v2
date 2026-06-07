export const R = {
  launch: '/pages/index/index', login: '/pages/login/index', role: '/pages/login/index',
  clientHome: '/pages-client/home/index', clientPublish: '/pages-client/publish/index',
  clientMatch: '/pages-client/match/index', clientOrder: '/pages-client/order/index',
  clientTrack: '/pages-client/track/index', clientReview: '/pages-client/review/index',
  pilotHall: '/pages-pilot/hall/index', pilotTask: '/pages-pilot/task/index', pilotWallet: '/pages-pilot/wallet/index',
  pilotHome: '/pages-pilot/home/index',
  ownerDrones: '/pages-owner/drones/index', ownerDispatch: '/pages-owner/dispatch/index', ownerWallet: '/pages-owner/wallet/index',
  ownerHome: '/pages-owner/home/index', ownerDevices: '/pages-owner/devices/index',
  admin: '/pages-admin/index/index', adminDashboard: '/pages-admin/dashboard/index',
};
export const go = (url: string) => uni.navigateTo({ url });
export const relaunch = (url: string) => uni.reLaunch({ url });
