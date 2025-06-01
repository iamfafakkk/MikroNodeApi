
const get_pool = (conn, callback) => {
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');
            conn.write('/ip/pool/print', [])
                .then((data) => {
                    console.log(data);
                    callback(data);
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.log(err);
        });
};

// const get_profile = (conn, callback) => {
//     conn.connect()
//         .then(() => {
//             console.log('Mikrotik connected');
//             conn.write('/ppp/profile/print', [])
//                 .then((data) => {
//                     console.log(data);
//                     callback(data);
//                 })
//                 .catch((err) => {
//                     console.log(err);
//                 });
//         })
//         .catch((err) => {
//             console.log(err);
//         });
// };

// const ppp_secret_add = (conn, value, callback) => {
//     console.log(value['remote-address']);
//     conn.connect()
//         .then(() => {
//             console.log('Mikrotik connected');
//             conn.write('/ppp/secret/add', [
//                 '=name=' + value.name,
//                 '=password=' + value.password,
//                 '=profile=' + value.profile,
//                 '=service=' + value.service
//             ])
//                 .then((data) => {
//                     var id = data[0].ret || null
//                     console.log(id);
//                     if (value['remote-address']) {
//                         conn.write('/ppp/secret/set', [
//                             '=.id=' + id,
//                             '=remote-address=' + value['remote-address']
//                         ])
//                             .catch((err) => {
//                                 console.error('Error setting remote address:', err);
//                             });
//                     }
//                     if (value['local-address']) {
//                         conn.write('/ppp/secret/set', [
//                             '=.id=' + id,
//                             '=local-address=' + value['local-address']
//                         ])
//                             .catch((err) => {
//                                 console.error('Error setting local address:', err);
//                             });
//                     }
//                     callback(data);
//                 })
//                 .catch((err) => {
//                     console.error('Error adding PPP secret:', err);
//                 });
//         })
//         .catch((err) => {
//             console.error('Connection error:', err);
//         });
// };


// const ppp_secret_delete = (conn, value, callback) => {
//     console.log(value);
//     conn.connect()
//         .then(() => {
//             console.log('Mikrotik connected');
//             conn.write('/ppp/secret/remove', [
//                 '=.id=' + value,
//             ])
//                 .then((data) => {
//                     callback('Deleted');
//                 })
//                 .catch((err) => {
//                     console.error('Error adding PPP secret:', err);
//                 });
//         })
//         .catch((err) => {
//             console.error('Connection error:', err);
//         });
// };

module.exports = {
    get_pool,
};
