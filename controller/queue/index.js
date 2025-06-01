// resourceController.js
let intervalId;

async function Queue(conn, params) {
    await conn.connect();
    return await conn.write('/queue/simple/print', params);
}

async function Queue_start(conn, interval, params = [], callback) {
    if (intervalId) {
        console.log('Interval sudah berjalan');
        return;
    }
    let resourceData
    intervalId = setInterval(async () => {
        try {
            resourceData = await Queue(conn, params);
            callback(resourceData);
        } catch (error) {
            console.error(error.message);
        }
    }, interval);

    console.log(`Interval berjalan setiap ${interval} ms`);
}

async function Queue_stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Interval dihentikan');
    }
}

module.exports = {
    Queue_start,
    Queue_stop
};
