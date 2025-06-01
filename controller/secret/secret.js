
const get_secret = (conn, callback) => {
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');
            conn.write('/ppp/secret/print', [])
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


const ppp_secret_add = (conn, value, callback) => {
    console.log(value['remote-address']);
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');
            conn.write('/ppp/secret/add', [
                '=name=' + value.name,
                '=password=' + value.password,
                '=profile=' + value.profile,
                '=service=' + value.service
            ])
                .then((data) => {
                    var id = data[0].ret || null
                    console.log(id);
                    if (value['remote-address']) {
                        conn.write('/ppp/secret/set', [
                            '=.id=' + id,
                            '=remote-address=' + value['remote-address']
                        ])
                            .catch((err) => {
                                console.error('Error setting remote address:', err);
                            });
                    }
                    if (value['local-address']) {
                        conn.write('/ppp/secret/set', [
                            '=.id=' + id,
                            '=local-address=' + value['local-address']
                        ])
                            .catch((err) => {
                                console.error('Error setting local address:', err);
                            });
                    }
                    callback(data);
                })
                .catch((err) => {
                    console.error('Error adding PPP secret:', err);
                });
        })
        .catch((err) => {
            console.error('Connection error:', err);
        });
};


const ppp_secret_delete = (conn, value, callback) => {
    console.log(value); // value adalah array
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');

            value.forEach((id) => {
                conn.write('/ppp/secret/remove', [
                    '=.id=' + id,
                ])
                    .then((data) => {
                        console.log('Deleted:', id);
                    })
                    .catch((err) => {
                        console.error('Error deleting PPP secret:', id, err);
                    });
            });

            // Memanggil callback setelah semua operasi selesai
            callback('All deleted');
        })
        .catch((err) => {
            console.error('Connection error:', err);
        });
};



const get_profile = (conn, callback) => {
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');
            conn.write('/ppp/profile/print', [])
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

const ppp_profile_add = (conn, value, callback) => {
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');
            conn.write('/ppp/profile/add', [
                '=name=' + value.name,
                '=local-address=' + value['local-address'],
                '=remote-address=' + value['remote-address'],
                '=only-one=' + value['only-one'],
            ])
                .then((data) => {
                    var id = data[0].ret || null
                    console.log(id);
                    if (value['rate-limit']) {
                        conn.write('/ppp/profile/set', [
                            '=.id=' + id,
                            '=rate-limit=' + value['rate-limit']
                        ])
                            .catch((err) => {
                                console.error('Error setting remote address:', err);
                            });
                    }
                    callback(data);
                })
                .catch((err) => {
                    console.error('Error adding PPP secret:', err);
                });
        })
        .catch((err) => {
            console.error('Connection error:', err);
        });
};
const ppp_profile_delete = (conn, value, callback) => {
    console.log(value); // value adalah array
    conn.connect()
        .then(() => {
            console.log('Mikrotik connected');

            value.forEach((id) => {
                conn.write('/ppp/profile/remove', [
                    '=.id=' + id,
                ])
                    .then((data) => {
                        console.log('Deleted:', id);
                    })
                    .catch((err) => {
                        console.error('Error deleting PPP profile:', id, err);
                    });
            });

            // Memanggil callback setelah semua operasi selesai
            callback('All deleted');
        })
        .catch((err) => {
            console.error('Connection error:', err);
        });
};

module.exports = {
    get_secret,
    ppp_secret_add,
    ppp_secret_delete,
    get_profile,
    ppp_profile_add,
    ppp_profile_delete
};
