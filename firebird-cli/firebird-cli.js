module.exports = function (RED) {
    var firebirCli = require('firebird-cli');

    function FirebirdNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.options = {
            host: n.host,
            port: n.port,
            database: n.db,
            user: node.credentials.user,
            password: node.credentials.password,
            role: null,
            pageSize: 4096
        };

        node.query = function (query, callback) {
            firebirCli.attach(node.options, function (err, db) {
                if (err) {
                    node.error(err);
                    callback(err, null);
                    return;
                }

                db.query(query, function (err, result) {
                    if(err) {
                        node.error(err);
                    }
                    callback(err, result);
                    db.detach();
                })
            });
        };

        node.on('close', function (done) {
            done();
        });
    }

    RED.nodes.registerType("firebirdDatabase", FirebirdNode, {
        credentials: {
            user: {type: "text"},
            password: {type: "password"}
        }
    });

    function FirebirdNodeIn(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.firebirddb = RED.nodes.getNode(n.firebirddb);

        if (node.firebirddb) {
            node.on("input", function (msg) {
                if (typeof msg.topic !== 'string') {
                    node.error("msg.topic : the query is not defined as a string");
                    node.status({fill: "red", shape: "ring", text: "Error"});
                    return;
                }
                node.status({fill: "green", shape: "dot", text: "Query..."});
                node.firebirddb.query(msg.topic, function (err, rows) {
                    if (err) {
                        node.error(err, msg);
                        node.status({fill: "red", shape: "ring", text: "Error"});
                    }
                    else {
                        msg.payload = rows;
                        node.send(msg);
                        node.status({fill: "green", shape: "dot", text: "OK"});
                    }
                });

            });
        } else {
            node.error("Firebird database not configured");
        }
    }

    RED.nodes.registerType("firebird", FirebirdNodeIn);
};