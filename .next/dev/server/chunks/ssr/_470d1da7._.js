module.exports = [
"[project]/app/actions/auth-action.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00035108611cd568b613d810ea8fb42a4a23ab22c3":"getPhoneNumber","00aee42763e8f97fe1308d7568430c49bb7ecd1fe6":"clearAuthCookies","00c38853a77493ea8f5a2460fcc63c8a33a55303c6":"isAuthenticated","00d778dd1c3532289cfc019d3d6dab3cbd3fe050a1":"getAuthToken","405375867bb6d640b6e3c974b276301a579e49d398":"setPhoneNumber","40ff6436f9c637d4bd6e5b0ba5f60a5996982f88be":"setAuthToken"},"",""] */ __turbopack_context__.s([
    "clearAuthCookies",
    ()=>clearAuthCookies,
    "getAuthToken",
    ()=>getAuthToken,
    "getPhoneNumber",
    ()=>getPhoneNumber,
    "isAuthenticated",
    ()=>isAuthenticated,
    "setAuthToken",
    ()=>setAuthToken,
    "setPhoneNumber",
    ()=>setPhoneNumber
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
const TOKEN_NAME = 'telegram_token';
const PHONE_NAME = 'telegram_phone';
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days
;
async function setAuthToken(token) {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
        cookieStore.set(TOKEN_NAME, token, {
            httpOnly: true,
            secure: ("TURBOPACK compile-time value", "development") === 'production',
            sameSite: 'lax',
            maxAge: MAX_AGE,
            path: '/'
        });
    } catch (error) {
        console.error('Failed to set auth token:', error);
        throw new Error('Failed to set authentication token');
    }
}
async function getAuthToken() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
        const token = cookieStore.get(TOKEN_NAME)?.value;
        return token || null;
    } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
}
async function setPhoneNumber(phone) {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
        cookieStore.set(PHONE_NAME, phone, {
            httpOnly: true,
            secure: ("TURBOPACK compile-time value", "development") === 'production',
            sameSite: 'lax',
            maxAge: MAX_AGE,
            path: '/'
        });
    } catch (error) {
        console.error('Failed to set phone number:', error);
        throw new Error('Failed to set phone number');
    }
}
async function getPhoneNumber() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
        const phone = cookieStore.get(PHONE_NAME)?.value;
        return phone || null;
    } catch (error) {
        console.error('Failed to get phone number:', error);
        return null;
    }
}
async function clearAuthCookies() {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
        cookieStore.delete(TOKEN_NAME);
        cookieStore.delete(PHONE_NAME);
    } catch (error) {
        console.error('Failed to clear auth cookies:', error);
        throw new Error('Failed to logout');
    }
}
async function isAuthenticated() {
    const token = await getAuthToken();
    return !!token;
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    setAuthToken,
    getAuthToken,
    setPhoneNumber,
    getPhoneNumber,
    clearAuthCookies,
    isAuthenticated
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(setAuthToken, "40ff6436f9c637d4bd6e5b0ba5f60a5996982f88be", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAuthToken, "00d778dd1c3532289cfc019d3d6dab3cbd3fe050a1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(setPhoneNumber, "405375867bb6d640b6e3c974b276301a579e49d398", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getPhoneNumber, "00035108611cd568b613d810ea8fb42a4a23ab22c3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(clearAuthCookies, "00aee42763e8f97fe1308d7568430c49bb7ecd1fe6", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(isAuthenticated, "00c38853a77493ea8f5a2460fcc63c8a33a55303c6", null);
}),
"[project]/.next-internal/server/app/chats/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/auth-action.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/auth-action.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/.next-internal/server/app/chats/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/auth-action.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00035108611cd568b613d810ea8fb42a4a23ab22c3",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPhoneNumber"],
    "00aee42763e8f97fe1308d7568430c49bb7ecd1fe6",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["clearAuthCookies"],
    "00c38853a77493ea8f5a2460fcc63c8a33a55303c6",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isAuthenticated"],
    "00d778dd1c3532289cfc019d3d6dab3cbd3fe050a1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAuthToken"],
    "405375867bb6d640b6e3c974b276301a579e49d398",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setPhoneNumber"],
    "40ff6436f9c637d4bd6e5b0ba5f60a5996982f88be",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setAuthToken"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$chats$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/chats/page/actions.js { ACTIONS_MODULE0 => "[project]/app/actions/auth-action.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$auth$2d$action$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/auth-action.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_470d1da7._.js.map