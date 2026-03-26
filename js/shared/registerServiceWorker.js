export async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register("/pages/sw.js");
        const registrations = await navigator.serviceWorker.getRegistrations();

        await Promise.all(
            registrations.map(existingRegistration => {
                if (existingRegistration.scope.endsWith("/pages/")) {
                    return null;
                }

                return existingRegistration.unregister();
            })
        );

        return registration;
    } catch {
        return null;
    }
}
