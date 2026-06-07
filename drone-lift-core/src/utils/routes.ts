export const R = {
  launch: '/pages/launch/index', login: '/pages/login/index', role: '/pages/role-select/index',
  clientHome: '/pages-client/home/index', clientPublish: '/pages-client/publish/index',
  clientMatch: '/pages-client/match/index', clientOrder: '/pages-client/order/index',
  pilotHall: '/pages-pilot/hall/index', pilotTask: '/pages-pilot/task/index', pilotWallet: '/pages-pilot/wallet/index',
  ownerDrones: '/pages-owner/drones/index', ownerDispatch: '/pages-owner/dispatch/index', ownerWallet: '/pages-owner/wallet/index',
  admin: '/pages-admin/index/index',
};
export const go = (url: string) => uni.navigateTo({ url });
export const relaunch = (url: string) => uni.reLaunch({ url });
