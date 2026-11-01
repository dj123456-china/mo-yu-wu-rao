(function () {
  "use strict";
  const KEY = "quiet-stall-profile-v1";
  const skins = [
    { id: "classic", name: "初心红", price: 0, color: "#ff625f", jacket: "#6095af", accent: "#ffd85a" },
    { id: "amber", name: "落日橙", price: 60, color: "#ffbe55", jacket: "#d89143", accent: "#ffd787" },
    { id: "violet", name: "星空紫", price: 120, color: "#bb9aff", jacket: "#8871b7", accent: "#d3baff" },
    { id: "mint", name: "薄荷绿", price: 180, color: "#69e3be", jacket: "#458d79", accent: "#b0f2d7" }
  ];
  const maps = [
    { id: "stall", name: "深夜隔间", price: 80 },
    { id: "snack", name: "突击自习", price: 80 },
    { id: "office", name: "总监办公室", price: 80 }
  ];
  let persistent = true;
  let profile = { coins: 0, owned: ["classic"], equipped: "classic", maps: [], best: {} };
  const integer = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(999999999, Math.floor(value)) : 0;
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved || typeof saved !== "object") return;
      profile.coins = integer(saved.coins);
      profile.owned = skins.filter(skin => skin.id === "classic" || (Array.isArray(saved.owned) && saved.owned.includes(skin.id))).map(skin => skin.id);
      profile.equipped = profile.owned.includes(saved.equipped) ? saved.equipped : "classic";
      profile.maps = maps.filter(map => Array.isArray(saved.maps) && saved.maps.includes(map.id)).map(map => map.id);
      maps.forEach(map => ["normal", "advanced"].forEach(tier => {
        const id = map.id + "-" + tier;
        profile.best[id] = integer(saved.best && saved.best[id]);
      }));
    } catch (error) {
      // Malformed saves are ignored; older finite-mode score keys are never changed.
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); persistent = true; }
    catch (error) { persistent = false; }
  }
  function result(ok, message) { return { ok: ok, message: message }; }
  function getState() {
    if (persistent) load();
    return { coins: profile.coins, owned: profile.owned.slice(), equipped: profile.equipped, maps: profile.maps.slice(), persistent: persistent };
  }
  function getSkin() { return skins.filter(skin => skin.id === profile.equipped)[0] || skins[0]; }
  function earn(amount) {
    if (persistent) load();
    const earned = Math.min(integer(amount), 999999999 - profile.coins);
    if (earned) { profile.coins += earned; save(); }
    return earned;
  }
  function buyOrEquipSkin(id) {
    if (persistent) load();
    const skin = skins.filter(item => item.id === id)[0];
    if (!skin) return result(false, "没有这款皮肤");
    if (!profile.owned.includes(id)) {
      if (profile.coins < skin.price) return result(false, "金币不足，还差 " + (skin.price - profile.coins) + " 金币");
      profile.coins -= skin.price;
      profile.owned.push(id);
    }
    profile.equipped = id;
    save();
    return result(true, "已装备「" + skin.name + "」，三张地图同步生效");
  }
  function isMapUnlocked(id) { return profile.maps.includes(id); }
  function unlockMap(id) {
    if (persistent) load();
    const map = maps.filter(item => item.id === id)[0];
    if (!map) return result(false, "没有这张地图");
    if (isMapUnlocked(id)) return result(true, "已解锁，可在地图下方选择高级");
    if (profile.coins < map.price) return result(false, "金币不足，还差 " + (map.price - profile.coins) + " 金币");
    profile.coins -= map.price;
    profile.maps.push(id);
    save();
    return result(true, "已解锁「" + map.name + "」，关闭商店后选择高级进入");
  }
  function recordKey(mode, advanced) { return mode + (advanced ? "-advanced" : "-normal"); }
  function getBest(mode, advanced) { return integer(profile.best[recordKey(mode, advanced)]); }
  function saveBest(mode, advanced, score) {
    if (persistent) load();
    if (!maps.some(map => map.id === mode)) return;
    const key = recordKey(mode, advanced);
    profile.best[key] = Math.max(getBest(mode, advanced), integer(score));
    save();
  }
  load();
  // Probe this profile key, never remove unrelated browser storage.
  save();
  window.GameEconomy = { skins: skins, maps: maps, getState: getState, getSkin: getSkin, earn: earn, buyOrEquipSkin: buyOrEquipSkin, isMapUnlocked: isMapUnlocked, unlockMap: unlockMap, getBest: getBest, saveBest: saveBest };
})();
