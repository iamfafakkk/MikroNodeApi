const { get_secret, get_profile, ppp_secret_add } = require("./secret");

const secretSocket = (socket, conn) => {
    socket.on('get_secret', (cred) => {
        console.log('get_secret be', conn);
        if (conn) {
            get_secret(conn, (callback) => {
                console.log(callback)
                socket.emit('res_secret', callback);
            });
        }
    });
    socket.on('get_profile', (cred) => {
        if (conn) {
            get_profile(conn, (callback) => {
                console.log(callback)
                socket.emit('res_profile', callback);
            });
        }
    });

    socket.on('ppp_secret_add', (value) => {
        if (conn && value) {
            ppp_secret_add(conn, value, (callback) => {
                socket.emit('res_ppp_secret_add', 'success');
            });

        }
    })
}

module.exports = secretSocket