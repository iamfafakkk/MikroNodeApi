// resourceController.js
let intervalId;

async function get_resource(conn) {
    const res = await conn.connect();
    return await conn.write('/system/resource/print', []);
}

async function get_resource_start(conn, interval, callback) {
    if (intervalId) {
        console.log('Interval sudah berjalan');
        return;
    }
    let resourceData
    intervalId = setInterval(async () => {
        try {
            resourceData = await get_resource(conn);
            callback(resourceData);
        } catch (error) {
            console.error('Error saat mendapatkan resource:', error);
        }
    }, interval);

    console.log(`Interval berjalan setiap ${interval} ms`);
}

async function get_resource_stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Interval dihentikan');
    }
}

module.exports = {
    get_resource_start,
    get_resource_stop
};
