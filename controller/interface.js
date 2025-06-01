const { RouterOSAPI } = require("node-routeros");
const { stop } = require("../../ros");

const get_interface = (conn, callback) => {
    // conn = new RouterOSAPI({
    //     host: ip,
    //     port: port,
    //     user: username,
    //     password: password,
    //     keepalive: true,
    // });
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');
            conn.write('/interface/print', [])
                .then((data) => {
                    console.log(data);
                    callback(data);
                    // conn.close();
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.log(err);
        });
};

module.exports = {
    get_interface
};
