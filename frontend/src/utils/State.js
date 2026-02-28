// OnlinePong
export let isOnline = 0;
export function setOnlineStatus(value){isOnline = value;}

// Si on quitte une instance "local"
export let currentPongInstance = null;
export function letCurrentPongInstance(value){currentPongInstance = value;}
export function returnCurrentPongInstance(){return currentPongInstance;}

// socket du chat global
export let globalChatWS = null;
export function setGlobalChatWS(value){globalChatWS = value;}
export function returnGlobalChatWS(){return globalChatWS;}
