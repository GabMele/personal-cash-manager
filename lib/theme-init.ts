// Eseguito inline in <head> prima del primo paint (evita il flash di tema sbagliato)
export const THEME_INIT = `try{var t=localStorage.getItem("pcm-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;
