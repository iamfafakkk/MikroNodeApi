const { RouterOSAPI } = require("node-routeros");
const {
  get_resource_start,
  get_resource_stop,
} = require("../controller/resource");
const { Queue_start, Queue_stop } = require("../controller/queue");
const {
  formatMemoryUsage,
  formatHddUsage,
  formatCpuFrequency,
} = require("../helpers");

class WebsocketController {
  constructor(server, io, app) {
    this.server = server;
    this.io = io;
    this.app = app;

    // Initialize global variables
    this.socketsId = new Map();
    this.current_socket = null;
    this.conns = new Map();
    this.conn = null;
    this.streaming = null;
    this.intervalId = null;
    this.activeIntervals = new Map();
    this.activeStreams = new Map();

    // Initialize
    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      const socketId = socket.id;
      this.current_socket = socket;

      socket.emit("log", "Connected");

      if (!this.socketsId.has(socketId)) {
        this.socketsId.set(socketId, socket);
      }

      socket.on("get_resource", async () => {
        await get_resource_start(this.conn, 1000, (data) => {
          console.log(data);
          socket.emit("res_resource", data[0] || {});
        });
      });

      socket.on("stopInterval", () => {
        get_resource_stop();
      });

      socket.on("disconnect", () => {
        this.socketsId.delete(socketId);
        this.current_socket = null;
        get_resource_stop();
        Queue_stop();
        console.log(`Socket disconnected: ${socketId}`);

        if (this.activeIntervals.has(socketId)) {
          const intervalData = this.activeIntervals.get(socketId);

          // Clear the interval
          if (intervalData.intervalId) {
            clearInterval(intervalData.intervalId);
          }

          // Mark socket data as inactive and close connection
          if (intervalData.socketData) {
            intervalData.socketData.isActive = false;
            // Close socket-specific connection if exists
            if (intervalData.socketData.connection && intervalData.socketData.connection.connected) {
              intervalData.socketData.connection.close();
              console.log(`Socket ${socketId} connection closed on disconnect event`);
            }
          }

          this.activeIntervals.delete(socketId);
          console.log(
            `Data untuk socket ${socketId} dihapus dari map activeIntervals`
          );
        }

        this.activeStreams.forEach((streamData, key) => {
          if (key === socketId) {
            if (streamData.stream) {
              streamData.stream.stop();
            }
            if (streamData.socketData) {
              streamData.socketData.isActive = false;
            }
          }
        });

        if (this.activeStreams.has(socketId)) {
          this.activeStreams.delete(socketId);
          console.log(`Stream untuk socketId ${socketId} berhasil dihapus.`);
        }
      });

      // TODO: SOCKET EVENT ROUTES
      socket.on("event/v2", async (props) => {
        try {
          await this.handleEventV2(socket, socketId, props);
        } catch (err) {
          console.error(`event/v2 handler error for ${socketId}:`, err && err.message ? err.message : err);
          try {
            socket.emit("event/v2/error", {
              message: err && err.message ? err.message : "Unknown error",
              socket_id: socketId,
              timestamp: new Date().toISOString(),
            });
          } catch (_) { }
        }
      });

      // EMIT AND LISTEN
      this.io.on('connection', (socket) => {
        socket.on('listen/v1', (payload = {}) => {
          try {
            socket.broadcast.emit('response/v1', payload); // or io.emit(...) if everyone needs it
          } catch (err) {
            console.error(`listen/v1 handler error for ${socket.id}:`, err?.message ?? err);
          }
        });
      });


      socket.on("stopstream", () => {
        if (this.streaming) {
          console.log("stopstream");
          this.streaming.stop();
        }
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
          console.log("Interval dihentikan");
        }
      });
    });
  }

  async handleEventV2(socket, socketId, props) {
    console.log(props);
    if (this.streaming) {
      console.log("stopstream");
      this.streaming.stop();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Interval dihentikan");
    }

    let server = props.server || {};
    let params = [];
    if (props.data.param) {
      params = props.data.param;
    }

    if (server.ip && server.user && server.pass) {
      try {
        // Validasi format IP:Port
        const ipPort = server.ip.split(":");
        if (ipPort.length !== 2 || isNaN(ipPort[1])) {
          throw new Error("Format IP tidak valid. Harus dalam format IP:PORT");
        }

        // Membuat kunci unik berbasis objek
        const connectionKey = JSON.stringify({
          ip: ipPort[0],
          port: parseInt(ipPort[1], 10),
          user: server.user,
          pass: server.pass,
        });

        const currentCred = {
          ip: ipPort[0],
          port: parseInt(ipPort[1], 10),
          user: server.user,
          pass: server.pass,
        };

        if (this.conns.has(connectionKey)) {
          console.log(`Menggunakan koneksi yang sudah ada untuk ${server.ip}`);
          this.conn = this.conns.get(connectionKey);

          // Cek status koneksi sebelum reconnect
          if (!this.conn.connected) {
            await this.conn.connect();
            console.log("Berhasil menyambungkan kembali ke Mikrotik");
          }
        } else {
          console.log(`Membuat koneksi baru ke ${server.ip}`);

          this.conn = new RouterOSAPI({
            host: currentCred.ip,
            port: currentCred.port,
            user: currentCred.user,
            password: currentCred.pass,
            keepalive: true,
          });

          // Handler error terpusat
          const errorHandler = (err) => {
            console.error(
              `Kesalahan koneksi [${currentCred.ip}]:`,
              err.message
            );
            this.conn.close();
          };

          // Event listeners
          this.conn
            .on("error", errorHandler)
            .on("close", () => {
              console.log(`Koneksi ke ${currentCred.ip} ditutup`);
            })
            .on("connected", () => {
              console.log(`Terhubung ke ${currentCred.ip}`);
            });

          // Melakukan koneksi dengan timeout
          await this.conn.connect();
          this.conns.set(connectionKey, this.conn);
        }
      } catch (error) {
        console.error("Kesalahan dalam proses koneksi:", error && error.message ? error.message : error);
        // Jangan lempar error agar tidak menjadi unhandledRejection
        try {
          if (socket && socket.emit) {
            socket.emit("event/v2/error", {
              message: error && error.message ? error.message : "Terjadi kesalahan koneksi",
              socket_id: socketId,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (_) { }
        return; // hentikan eksekusi
      }
    }

    // Handle different paths
    await this.handleSocketPaths(socket, socketId, props, server, params);
  }

  async handleSocketPaths(socket, socketId, props, server, params) {
    switch (props.path) {
      case "/interface/ethernet":
        await this.handleInterfaceEthernet(socket, socketId, server, params);
        break;
      case "/queue/simple/print":
        await this.handleQueueSimplePrint(socket, socketId, params);
        break;
      case "/ip/neighbor":
        await this.handleIpNeighbor(socket, socketId, server, params);
        break;
      case "/ping":
        await this.handlePing(socket, socketId, params);
        break;
      case "/tool/traceroute":
        await this.handleTraceroute(socket, socketId, params);
        break;
      case "/tool/torch":
        await this.handleTorch(socket, socketId, params);
        break;
      case "/ppp/active":
        await this.handlePppActive(socket, socketId, server, params);
        break;
      case "/ppp/secret":
        await this.handlePppSecret(socket, socketId, params);
        break;
      case "/monitoring/pppoe":
        await this.handleMonitoringPppoe(socket, socketId, server, params);
        break;
      case "/monitoring/static":
        await this.handleMonitoringStatic(socket, socketId, server, params);
        break;
      case "/interface/monitor-traffic":
        await this.handleInterfaceMonitorTraffic(socket, socketId, params);
        break;
      case "/monitoring/active":
        await this.handleMonitoringActive(socket, socketId, server, params);
        break;
      case "/monitoring/activeMulti":
        await this.handleMonitoringActiveMulti(
          socket,
          socketId,
          props.data
        );
        break;
      case "/monitoring/statik":
        await this.handleMonitoringStatik(socket, socketId, server, params);
        break;
      case "/system/resource":
        await this.handleSystemResource(socket, socketId, server, params, props);
        break;
    }
  }
  async handleSystemResource(socket, socketId, server, params = [], props = {}) {
    const page = props?.page || null;
    const requestId = props?.requestId || props?.data?.requestId || null;

    if (!socket || !socket.connected) {
      console.warn(`Socket ${socketId} tidak terhubung, skip handleSystemResource`);
      return;
    }

    if (!this.conn || !this.conn.connected) {
      console.error(`Router connection belum siap untuk socket ${socketId}`);
      socket.emit("/system/resource", {
        error: "Router connection is not ready",
        socket_id: socketId,
        page,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parseHostPort = (ipWithPort) => {
      if (typeof ipWithPort !== "string") {
        return { host: null, port: null };
      }

      const [hostPart, portPart] = ipWithPort.split(":");
      const parsedPort = portPart && !Number.isNaN(Number(portPart))
        ? Number(portPart)
        : null;

      return {
        host: hostPart || null,
        port: parsedPort,
      };
    };

    const addressInfo = parseHostPort(server?.ip);
    const serverHost = server?.host || addressInfo.host;
    const serverPort = server?.port || addressInfo.port;

    const socketData = {
      isActive: true,
      socketId,
      serverName: server?.name || null,
      page,
      requestId,
    };

    let hitung = 0;
    const newIntervalId = setInterval(async () => {
      try {
        if (!socket.connected) {
          socketData.isActive = false;
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          console.log(`Interval untuk socket ${socketId} dihentikan - socket tidak terhubung`);
          return;
        }

        const resources = await this.conn.write(
          "/system/resource/print",
          params
        );

        // Process the system resource data with formatted values
        const tempResData = resources.map((resource) => {
          const memoryUsage = formatMemoryUsage(
            resource["free-memory"],
            resource["total-memory"]
          );
          const hddUsage = formatHddUsage(
            resource["free-hdd-space"],
            resource["total-hdd-space"]
          );

          return {
            uptime: resource.uptime || "0s",
            version: resource.version || "N/A",
            buildTime: resource["build-time"] || "N/A",
            freeMemory: resource["free-memory"] || "0",
            totalMemory: resource["total-memory"] || "0",
            cpu: resource["cpu"] || "0%",
            cpuCount: resource["cpu-count"] || "1",
            cpuFrequency: resource["cpu-frequency"] || "0",
            cpuLoad: resource["cpu-load"] || "0%",
            freeHddSpace: resource["free-hdd-space"] || "0",
            totalHddSpace: resource["total-hdd-space"] || "0",
            architectureName: resource["architecture-name"] || "N/A",
            boardName: resource["board-name"] || "N/A",
            platform: resource["platform"] || "N/A",
            // Formatted values
            memory: memoryUsage,
            hdd: hddUsage,
            cpuFrequencyFormatted: formatCpuFrequency(
              resource["cpu-frequency"]
            ),
          };
        });

        hitung++;
        if (hitung > 5) {
          hitung = 0;
          if (!this.socketsId.has(socketId)) {
            clearInterval(newIntervalId);
            this.activeIntervals.delete(socketId);
            socketData.isActive = false;
            console.log(
              `Interval untuk socket ${socketId} dihentikan karena sudah melebihi batas`
            );
            return;
          }
        }

        const resourcePayload = tempResData[0] || {};
        const enrichedPayload = {
          ...resourcePayload,
          socket_id: socketId,
          page,
          request_id: requestId,
          router: server?.name || null,
          server_name: server?.name || null,
          server_id: server?.id || null,
          host: serverHost || null,
          port: serverPort || null,
          ip: server?.ip || null,
          timestamp: new Date().toISOString(),
          meta: {
            socket_id: socketId,
            page,
            request_id: requestId,
            server: {
              id: server?.id || null,
              name: server?.name || null,
              host: serverHost || null,
              port: serverPort || null,
              ip: server?.ip || null,
            },
          },
        };

        console.log(
          `${hitung} ${server?.name || "unknown"
          } ${"/system/resource"} dikirim ke ${socketId}${page ? ` (page: ${page})` : ""}`
        );
        socket.emit("/system/resource", enrichedPayload);
      } catch (error) {
        console.error("Error saat mendapatkan data:", error.message);
        // Emit error to client
        socket.emit("/system/resource", {
          error: error.message,
          socket_id: socketId,
          page,
          request_id: requestId,
          router: server?.name || null,
          server_name: server?.name || null,
          server_id: server?.id || null,
          host: serverHost || null,
          port: serverPort || null,
          ip: server?.ip || null,
          timestamp: new Date().toISOString(),
        });
      }
    }, 1000);
    this.activeIntervals.set(socketId, {
      intervalId: newIntervalId,
      socketData,
    });
  }

  async handleInterfaceEthernet(socket, socketId, server, params) {
    let resData = [];
    let hitung = 0;
    const newIntervalId = setInterval(async () => {
      try {
        const tempResData = [];
        const trafficPromises = [];
        const interfaces = await this.conn.write("/interface/print", params);

        if (resData.length >= interfaces.length) {
          resData = [];
        }

        for (const [index, element] of interfaces.entries()) {
          let traffic = {};

          const trafficPromise = this.conn
            .write("/interface/monitor-traffic", [
              `=interface=${element.name}`,
              `=once=`,
            ])
            .then((result) => {
              traffic = result[0] || {};
              tempResData[index] = {
                name: element.name,
                item: element,
                traffic: traffic,
              };
            });
          trafficPromises.push(trafficPromise);
        }

        await Promise.all(trafficPromises);
        hitung++;
        if (hitung > 5) {
          hitung = 0;
          if (!this.socketsId.has(socketId)) {
            clearInterval(newIntervalId);
            this.activeIntervals.delete(socketId);
            console.log(
              `Interval untuk socket ${socketId} dihentikan karena sudah melebihi batas`
            );
          }
        }
        console.log(
          `${hitung} ${server?.name
          } ${"/interface/ethernet"} dikirim ke ${socketId}`
        );
        socket.emit("/interface/ethernet", tempResData);
      } catch (error) {
        console.error("Error saat mendapatkan data:", error.message);
      }
    }, 1000);
    this.activeIntervals.set(socketId, newIntervalId);
  }

  async handleQueueSimplePrint(socket, socketId, params) {
    if (!params || params.length === 0) {
      await Queue_start(this.conn, 1000, [], (data) => {
        socket.emit("/queue/simple/print", data || {});
      });
    } else {
      await Queue_start(this.conn, 1000, params, (data) => {
        console.log(data[0]["rate"]);
        socket.emit("/queue/simple/print", data[0] || {});
      });
    }
  }

  async handleIpNeighbor(socket, socketId, server, params) {
    if (this.intervalId) {
      console.log("Interval sudah berjalan");
      return;
    }

    let resData;
    let hitung = 0;
    const newIntervalId = setInterval(async () => {
      try {
        resData = await this.conn.write("/ip/neighbor/print", params);
        hitung++;
        if (hitung > 5) {
          hitung = 0;
          if (!this.socketsId.has(socketId)) {
            clearInterval(newIntervalId);
            this.activeIntervals.delete(socketId);
            console.log(
              `Interval untuk socket ${socketId} dihentikan karena sudah melebihi batas`
            );
          }
        }
        console.log(
          `${hitung} ${server?.name} ${"/ip/neighbor"} dikirim ke ${socketId}`
        );
        socket.emit("/ip/neighbor", resData || {});
      } catch (error) {
        console.error("Error saat mendapatkan data:", error.message);
      }
    }, 1000);
    this.activeIntervals.set(socketId, newIntervalId);
  }

  async handlePing(socket, socketId, params) {
    const activeSocket = new Map();
    console.log(`Socket connected: ${socketId}`);
    console.log("streaming /ping");

    if (activeSocket.has(socketId)) {
      console.log(`Stream already exists for socketId: ${socketId}`);
      return;
    }

    var streaming2 = this.conn.stream("/ping", params, (error, packet) => {
      if (!error) {
        console.log(`/ping dikirim ke ${socketId}`);
        socket.emit("/ping", packet || {});
      } else {
        console.log(error);
      }
    });

    socket.on("stopstream", () => {
      if (streaming2) {
        console.log("stopstream");
        streaming2.stop();
      }
    });

    activeSocket.set(socketId, streaming2);
    const targetSocket = this.io.sockets.sockets.get(socketId);
    if (targetSocket) {
      targetSocket.on("disconnect", () => {
        streaming2.stop();
        console.log(`Socket disconnected: ${socketId}`);
        activeSocket.delete(socketId);
      });
    }
  }

  async handleTraceroute(socket, socketId, params) {
    const activeSocket = new Map();
    console.log(`Socket connected: ${socketId}`);
    console.log("streaming /tool/traceroute");

    if (activeSocket.has(socketId)) {
      console.log(`Stream already exists for socketId: ${socketId}`);
      return;
    }

    var streaming2 = this.conn.stream(
      "/tool/traceroute",
      params,
      (error, packet) => {
        if (!error) {
          socket.emit("/tool/traceroute", packet || {});
        } else {
          console.log(error);
        }
      }
    );

    socket.on("stopstream", () => {
      if (streaming2) {
        console.log("stopstream");
        streaming2.stop();
      }
    });

    activeSocket.set(socketId, streaming2);
    const targetSocket = this.io.sockets.sockets.get(socketId);
    if (targetSocket) {
      targetSocket.on("disconnect", () => {
        streaming2.stop();
        console.log(`Socket disconnected: ${socketId}`);
        activeSocket.delete(socketId);
      });
    }
  }

  async handleTorch(socket, socketId, params) {
    this.streaming = this.conn.stream(
      "/tool/torch",
      params,
      (error, packet) => {
        if (!error) {
          console.log(packet);
          socket.emit("/tool/torch", packet || {});
        } else {
          console.log(error);
        }
      }
    );
  }

  async handlePppActive(socket, socketId, server, params) {
    if (this.activeIntervals.has(socketId)) {
      console.log(`Interval untuk socket ${socketId} sudah berjalan`);
      return;
    }

    let resData;
    let hitung = 0;
    const newIntervalId = setInterval(async () => {
      try {
        resData = await this.conn.write("/ppp/active/print", params);
        hitung++;
        if (hitung > 5) {
          hitung = 0;
          if (!this.socketsId.has(socketId)) {
            clearInterval(newIntervalId);
            this.activeIntervals.delete(socketId);
            console.log(
              `Interval untuk socket ${socketId} dihentikan karena sudah melebihi batas`
            );
          }
        }
        console.log(
          `${hitung} ${server?.name} ${"/ppp/active"} dikirim ke ${socketId}`
        );
        socket.emit("/ppp/active", resData || {});
      } catch (error) {
        console.error("Error saat mendapatkan data:", error.message);
      }
    }, 1000);
    console.log(`Interval berjalan setiap ${1000} ms`);
    this.activeIntervals.set(socketId, newIntervalId);
  }

  async handlePppSecret(socket, socketId, params) {
    let resData;
    try {
      resData = await this.conn.write("/ppp/secret/print", params);
      socket.emit("/ppp/secret", resData || {});
    } catch (error) {
      console.error("Error saat mendapatkan data:", error.message);
    }
  }

  async handleMonitoringPppoe(socket, socketId, server, params) {
    console.log(`Socket connected: ${socketId}`);

    // Validate input parameters
    if (!socket || !socketId || !server) {
      console.error(`Invalid parameters for handleMonitoringPppoe: socket=${!!socket}, socketId=${socketId}, server=${!!server}`);
      return;
    }

    // Check if interval already exists for this socket
    if (this.activeIntervals.has(socketId)) {
      console.log(`Interval untuk socket ${socketId} sudah berjalan`);
      return;
    }

    // Validate socket is still connected
    if (!socket.connected) {
      console.log(`Socket ${socketId} tidak terhubung`);
      return;
    }

    // Create socket-specific connection
    let socketConn = null;
    try {
      if (server.ip && server.user && server.pass) {
        // Validasi format IP:Port
        const ipPort = server.ip.split(":");
        if (ipPort.length !== 2 || isNaN(ipPort[1])) {
          throw new Error("Format IP tidak valid. Harus dalam format IP:PORT");
        }

        const currentCred = {
          ip: ipPort[0],
          port: parseInt(ipPort[1], 10),
          user: server.user,
          pass: server.pass,
        };

        // Create dedicated connection for this socket
        socketConn = new RouterOSAPI({
          host: currentCred.ip,
          port: currentCred.port,
          user: currentCred.user,
          password: currentCred.pass,
          keepalive: true,
        });

        // Event listeners for socket-specific connection
        socketConn
          .on("error", (err) => {
            console.error(`Socket ${socketId} connection error [${currentCred.ip}]:`, err.message);
          })
          .on("close", () => {
            console.log(`Socket ${socketId} connection closed to ${currentCred.ip}`);
          })
          .on("connected", () => {
            console.log(`Socket ${socketId} connected to ${currentCred.ip}`);
          });

        // Connect with timeout
        await socketConn.connect();
        console.log(`Socket ${socketId} created dedicated connection to ${server.ip}`);
      }
    } catch (error) {
      console.error(`Socket ${socketId} connection error:`, error.message);
      if (socket.connected) {
        socket.emit("/monitoring/pppoe", {
          error: `Connection failed: ${error.message}`,
          socket_id: socketId,
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Create socket-specific data storage with unique identifier
    const socketData = {
      resData: [],
      hitung: 0,
      isActive: true,
      socketId: socketId,
      serverName: server?.name || 'unknown',
      params: params,
      lastUpdate: new Date().toISOString(),
      uniqueId: `${socketId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connection: socketConn
    };

    const newIntervalId = setInterval(async () => {
      try {
        // Check if socket is still connected and interval is still active
        if (!socket.connected || !socketData.isActive) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          // Close socket-specific connection
          if (socketData.connection && socketData.connection.connected) {
            socketData.connection.close();
            console.log(`Socket ${socketId} connection closed`);
          }
          console.log(`Interval untuk socket ${socketId} dihentikan - socket tidak terhubung`);
          return;
        }

        // Create socket-specific temporary data arrays
        const tempResData = [];
        const trafficPromises = [];

        // Get data with socket-specific error handling
        let secret, active;
        try {
          secret = await socketData.connection.write("/ppp/secret/print", params);
          active = await socketData.connection.write("/ppp/active/print", params);
        } catch (error) {
          console.error(`Error getting data for socket ${socketId}:`, error.message);
          if (socket.connected) {
            socket.emit("/monitoring/pppoe", {
              error: error.message,
              socket_id: socketId,
              timestamp: new Date().toISOString()
            });
          }
          return;
        }

        const activeMap = new Map(
          active.map((a) => [a.name, { address: a.address, uptime: a.uptime }])
        );

        // Reset socket-specific data if needed
        if (socketData.resData.length >= secret.length) {
          socketData.resData = [];
        }

        // Process each secret with socket-specific tracking
        for (const [index, element] of secret.entries()) {
          let status = activeMap.has(element.name) ? "online" : "offline";
          let activeData = activeMap.get(element.name) || {};
          let address = activeData.address || "N/A";
          let uptime = activeData.uptime || "N/A";
          let pppoeName =
            element["service"] == "pppoe"
              ? "<pppoe-" + element.name + ">"
              : element["service"] == "l2tp"
                ? "<l2tp-" + element.name + ">"
                : "";
          let traffic = {};

          if (status === "online" && pppoeName) {
            const trafficPromise = socketData.connection
              .write("/interface/monitor-traffic", [
                `=interface=${pppoeName}`,
                `=once=`,
              ])
              .then((result) => {
                traffic = result[0] || {};
                tempResData[index] = {
                  name: element.name,
                  status,
                  router: server.name,
                  address,
                  uptime,
                  traffic,
                  socket_id: socketId,
                  unique_id: socketData.uniqueId,
                  item_index: index,
                  timestamp: new Date().toISOString()
                };
              })
              .catch((error) => {
                console.error(`Traffic error for ${element.name} on socket ${socketId}:`, error.message);
                tempResData[index] = {
                  name: element.name,
                  status,
                  router: server.name,
                  address,
                  uptime,
                  traffic: { error: error.message },
                  socket_id: socketId,
                  unique_id: socketData.uniqueId,
                  item_index: index,
                  timestamp: new Date().toISOString()
                };
              });
            trafficPromises.push(trafficPromise);
          } else {
            tempResData[index] = {
              name: element.name,
              status,
              router: server.name,
              address,
              uptime,
              traffic,
              socket_id: socketId,
              unique_id: socketData.uniqueId,
              item_index: index,
              timestamp: new Date().toISOString()
            };
          }
        }

        // Wait for all traffic promises to complete
        await Promise.all(trafficPromises);
        socketData.hitung++;
        socketData.lastUpdate = new Date().toISOString();

        // Reset counter every 5 iterations
        if (socketData.hitung > 5) {
          socketData.hitung = 0;
        }

        console.log(
          `${socketData.hitung} ${server?.name
          } ${"/monitoring/pppoe"} dikirim ke ${socketId} - ${tempResData.length} items (unique: ${socketData.uniqueId})`
        );

        // Double-check socket is still connected before emitting
        if (socket.connected) {
          // Final validation - ensure data belongs to this socket
          const validatedData = tempResData.filter(item =>
            item && item.socket_id === socketId && item.unique_id === socketData.uniqueId
          );

          console.log(`Validating data for socket ${socketId}: ${validatedData.length}/${tempResData.length} items valid`);

          socket.emit("/monitoring/pppoe", validatedData);
        } else {
          // Socket disconnected, clean up
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          // Close socket-specific connection
          if (socketData.connection && socketData.connection.connected) {
            socketData.connection.close();
            console.log(`Socket ${socketId} connection closed on disconnect`);
          }
          console.log(`Interval untuk socket ${socketId} dihentikan - socket terputus`);
        }
      } catch (error) {
        console.error(`Error saat mendapatkan data untuk socket ${socketId}:`, error.message);

        // If there's an error, check if socket is still valid
        if (!socket.connected) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          // Close socket-specific connection
          if (socketData.connection && socketData.connection.connected) {
            socketData.connection.close();
            console.log(`Socket ${socketId} connection closed on error`);
          }
          console.log(`Interval untuk socket ${socketId} dihentikan karena error`);
        } else {
          // Send error response to specific socket
          socket.emit("/monitoring/pppoe", {
            error: error.message,
            socket_id: socketId,
            server_name: server?.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 1000);

    // Store interval with socket data for proper cleanup
    this.activeIntervals.set(socketId, {
      intervalId: newIntervalId,
      socketData: socketData,
      socket: socket
    });
  }

  async handleMonitoringStatic(socket, socketId, server, params) {
    console.log(`Socket connected: ${socketId}`);

    // Check if interval already exists for this socket
    if (this.activeIntervals.has(socketId)) {
      console.log(`Interval untuk socket ${socketId} sudah berjalan`);
      return;
    }

    // Validate socket is still connected
    if (!socket.connected) {
      console.log(`Socket ${socketId} tidak terhubung`);
      return;
    }

    // Create socket-specific data storage with unique identifier
    const socketData = {
      resData: [],
      hitung: 0,
      isActive: true,
      socketId: socketId,
      serverName: server?.name || 'unknown',
      params: params
    };

    const newIntervalId = setInterval(async () => {
      try {
        // Check if socket is still connected and interval is still active
        if (!socket.connected || !socketData.isActive) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          console.log(`Interval untuk socket ${socketId} dihentikan - socket tidak terhubung`);
          return;
        }

        // Get data with socket-specific error handling
        let bindings, hosts;
        try {
          bindings = await this.conn.write(
            "/ip/hotspot/ip-binding/print",
            params
          );
          hosts = await this.conn.write("/ip/hotspot/host/print", params);
        } catch (error) {
          console.error(`Error getting data for socket ${socketId}:`, error.message);
          if (socket.connected) {
            socket.emit("/monitoring/static", {
              error: error.message,
              socket_id: socketId,
              timestamp: new Date().toISOString()
            });
          }
          return;
        }

        const activeMap = new Map(
          hosts.map((host) => [
            host["mac-address"],
            {
              address: host.address || "N/A",
              idle: host["idle-time"] || "N/A",
              uptime: host["uptime"] || "N/A",
            },
          ])
        );

        // Reset socket-specific data if needed
        if (socketData.resData.length >= bindings.length) {
          socketData.resData = [];
        }

        // Process each binding with socket-specific tracking
        const tempResData = [];
        bindings.forEach((binding) => {
          const macAddress = binding["mac-address"];
          const isOnline = activeMap.has(macAddress);
          const activeData = activeMap.get(macAddress) || {};

          tempResData.push({
            name: binding.comment || activeData.address || "N/A",
            bypassed: binding.bypassed,
            uptime: activeData.uptime,
            status: isOnline ? "online" : "offline",
            router: server.name,
            address: activeData.address,
            idle: activeData.idle,
            socket_id: socketId,
            timestamp: new Date().toISOString()
          });
        });

        socketData.hitung++;

        // Reset counter every 5 iterations
        if (socketData.hitung > 5) {
          socketData.hitung = 0;
        }

        console.log(
          `${socketData.hitung} ${server?.name
          } ${"/monitoring/static"} dikirim ke ${socketId} - ${tempResData.length} items`
        );

        // Double-check socket is still connected before emitting
        if (socket.connected) {
          socket.emit("/monitoring/static", {
            data: tempResData,
            socket_id: socketId,
            server_name: server?.name,
            total_items: tempResData.length,
            timestamp: new Date().toISOString()
          });
        } else {
          // Socket disconnected, clean up
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan - socket terputus`);
        }
      } catch (error) {
        console.error(`Error pada socket ${socketId}:`, error.message);

        // If there's an error, check if socket is still valid
        if (!socket.connected) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan karena error`);
        } else {
          // Send error response to specific socket
          socket.emit("/monitoring/static", {
            error: error.message,
            socket_id: socketId,
            server_name: server?.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 1000);

    // Store interval with socket data for proper cleanup
    this.activeIntervals.set(socketId, {
      intervalId: newIntervalId,
      socketData: socketData,
      socket: socket
    });
  }

  async handleInterfaceMonitorTraffic(socket, socketId, params) {
    console.log(`Socket connected: ${socketId}`);
    console.log("streaming monitor-traffic");

    // Check if stream already exists for this socket
    if (this.activeStreams.has(socketId)) {
      console.log(`Stream already exists for socketId: ${socketId}`);
      return;
    }

    // Validate socket is still connected
    if (!socket.connected) {
      console.log(`Socket ${socketId} tidak terhubung`);
      return;
    }

    // Create socket-specific data storage
    const socketData = {
      streamHitung: 0,
      isActive: true
    };

    var streaming2 = await this.conn.stream(
      "/interface/monitor-traffic",
      params,
      (error, packet) => {
        if (!error) {
          // Check if socket is still connected and stream is still active
          if (!socket.connected || !socketData.isActive) {
            streaming2.stop();
            this.activeStreams.delete(socketId);
            console.log(`Stream untuk socket ${socketId} dihentikan - socket tidak terhubung`);
            return;
          }

          const emitx = {
            rate:
              (packet?.[0]?.["rx-bits-per-second"] || 0) +
              "/" +
              (packet?.[0]?.["tx-bits-per-second"] || 0),
          };
          console.log(`${emitx.rate} dikirim ke ${socketId}`);

          // Double-check socket is still connected before emitting
          if (socket.connected) {
            socketData.streamHitung++;
            if (socketData.streamHitung > 50) {
              socketData.streamHitung = 0;
            }
            socket.emit("/interface/monitor-traffic", emitx || {});
          } else {
            // Socket disconnected, clean up
            streaming2.stop();
            this.activeStreams.delete(socketId);
            socketData.isActive = false;
            console.log(`Stream untuk socket ${socketId} dihentikan - socket terputus`);
          }
        } else {
          console.log(error);

          // If there's an error, check if socket is still valid
          if (!socket.connected) {
            streaming2.stop();
            this.activeStreams.delete(socketId);
            socketData.isActive = false;
            console.log(`Stream untuk socket ${socketId} dihentikan karena error`);
          }
        }
      }
    );

    // Store stream with socket data for proper cleanup
    this.activeStreams.set(socketId, {
      stream: streaming2,
      socketData: socketData,
      socket: socket
    });
  }

  async handleMonitoringActive(socket, socketId, server, params) {
    console.log(`Socket connected: ${socketId}`);

    // Check if interval already exists for this socket
    if (this.activeIntervals.has(socketId)) {
      console.log(`Interval untuk socket ${socketId} sudah berjalan`);
      return;
    }

    // Validate socket is still connected
    if (!socket.connected) {
      console.log(`Socket ${socketId} tidak terhubung`);
      return;
    }

    // Create socket-specific data storage
    const socketData = {
      resData: [],
      hitung: 0,
      isActive: true
    };

    const newIntervalId = setInterval(async () => {
      try {
        const tempResData = [];
        const trafficPromises = [];
        const active = await this.conn.write("/ppp/active/print", params);

        let status = active[0]?.name ? "online" : "offline";
        let address = active[0]?.address || "N/A";
        let uptime = active[0]?.uptime || "N/A";
        let pppoeName =
          active[0]?.["service"] == "pppoe"
            ? "<pppoe-" + active[0]?.name + ">"
            : active[0]?.["service"] == "l2tp"
              ? "<l2tp-" + active[0]?.name + ">"
              : "";
        let ping = {};
        let traffic = {};

        if (status === "online" && pppoeName) {
          try {
            ping = await this.conn.write("/ping", [
              `=address=${active[0]?.address}`,
              "=count=1",
            ]);
          } catch (error) {
            // Error handling for ping
          }

          const trafficPromise = this.conn
            .write("/interface/monitor-traffic", [
              `=interface=${pppoeName}`,
              `=once=`,
            ])
            .then((result) => {
              traffic = {
                rate:
                  (result?.[0]?.["rx-bits-per-second"] || 0) +
                  "/" +
                  (result?.[0]?.["tx-bits-per-second"] || 0),
              };
              tempResData[0] = {
                name: active.name,
                username: active[0].name || "N/A",
                status,
                router: server.name,
                address,
                uptime,
                traffic,
                ping: ping[0] || {},
                socket_id: socket.id,
              };
            });
          trafficPromises.push(trafficPromise);
        } else {
          tempResData[0] = {
            name: active.name,
            status,
            router: server.name,
            address,
            uptime,
            traffic,
            ping: ping[0] || {},
            socket_id: socket.id,
          };
        }

        await Promise.all(trafficPromises);
        socketData.hitung++;

        // Reset counter every 5 iterations
        if (socketData.hitung > 5) {
          socketData.hitung = 0;
        }

        console.log(
          `${socketData.hitung} ${server?.name
          } ${"/monitoring/active"} dikirim ke ${socketId} - ${params}`
        );

        // Double-check socket is still connected before emitting
        if (socket.connected) {
          // console.log(tempResData)
          socket.emit("/monitoring/active", tempResData);
        } else {
          // Socket disconnected, clean up
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan - socket terputus`);
        }
      } catch (error) {
        console.error("Error saat mendapatkan data:", error.message);

        // If there's an error, check if socket is still valid
        if (!socket.connected) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan karena error`);
        }
      }
    }, 1000);

    // Store interval with socket data for proper cleanup
    this.activeIntervals.set(socketId, {
      intervalId: newIntervalId,
      socketData: socketData,
      socket: socket
    });
  }

  async handleMonitoringStatik(socket, socketId, server, params) {
    console.log(`Socket connected: ${socketId}`);

    // Check if interval already exists for this socket
    if (this.activeIntervals.has(socketId)) {
      console.log(`Interval untuk socket ${socketId} sudah berjalan`);
      return;
    }

    // Validate socket is still connected
    if (!socket.connected) {
      console.log(`Socket ${socketId} tidak terhubung`);
      return;
    }

    // Create socket-specific data storage
    const socketData = {
      resData: [],
      hitung: 0,
      isActive: true
    };

    const newIntervalId = setInterval(async () => {
      try {
        const tempResData = [];
        const trafficPromises = [];
        const active = await this.conn.write("/ip/hotspot/host/print", [
          params,
        ]);

        let status = active[0]?.address ? "online" : "offline";
        let address = active[0]?.address || "N/A";
        let uptime = active[0]?.uptime || "N/A";

        let ping = {};
        let traffic = {};

        if (status === "online" && address) {
          try {
            ping = await this.conn.write("/ping", [
              `=address=${address}`,
              "=count=1",
            ]);
          } catch (error) {
            // Error handling for ping
          }

          const trafficPromise = this.conn
            .write("/queue/simple/print", [`?target=${address}/32`])
            .then((result) => {
              traffic = {
                rate:
                  (result?.[0]?.["rate"].split("/")[0] || 0) +
                  "/" +
                  (result?.[0]?.["rate"].split("/")[1] || 0),
              };
              tempResData[0] = {
                name: active?.[0]?.comment || "N/A",
                status,
                router: server.name,
                address,
                uptime,
                traffic,
                ping: ping[0] || {},
              };
            });
          trafficPromises.push(trafficPromise);
        } else {
          tempResData[0] = {
            name: active?.[0]?.comment || "N/A",
            status,
            router: server.name,
            address,
            uptime,
            traffic,
            ping: ping[0] || {},
          };
        }

        await Promise.all(trafficPromises);
        socketData.hitung++;

        // Reset counter every 5 iterations
        if (socketData.hitung > 5) {
          socketData.hitung = 0;
        }

        console.log(
          `${socketData.hitung} ${server?.name
          } ${"/monitoring/statik"} dikirim ke ${socketId}`
        );
        console.log(tempResData);

        // Double-check socket is still connected before emitting
        if (socket.connected) {
          socket.emit("/monitoring/statik", tempResData);
        } else {
          // Socket disconnected, clean up
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan - socket terputus`);
        }
      } catch (error) {
        console.error("Error saat mendapatkan data:", error.message);

        // If there's an error, check if socket is still valid
        if (!socket.connected) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan karena error`);
        }
      }
    }, 1000);

    // Store interval with socket data for proper cleanup
    this.activeIntervals.set(socketId, {
      intervalId: newIntervalId,
      socketData: socketData,
      socket: socket
    });
  }

  async handleMonitoringActiveMulti(socket, socketId, userPppoes) {
    // userPppoes adalah array dari frontend yang berisi multiple server dan param
    console.log(`Socket connected: ${socketId}`);
    console.log(`User PPPoEs received:`, userPppoes);

    // Check if interval already exists for this socket
    if (this.activeIntervals.has(socketId)) {
      console.log(`Interval untuk socket ${socketId} sudah berjalan`);
      return;
    }

    // Validate socket is still connected
    if (!socket.connected) {
      console.log(`Socket ${socketId} tidak terhubung`);
      return;
    }

    // Create socket-specific data storage
    const socketData = {
      hitung: 0,
      isActive: true
    };

    const newIntervalId = setInterval(async () => {
      try {
        const allResults = [];

        // Check if socket is still connected and interval is still active
        if (!socket.connected || !socketData.isActive) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          console.log(`Interval untuk socket ${socketId} dihentikan - socket tidak terhubung`);
          return;
        }

        // Validasi input
        if (!Array.isArray(userPppoes) || userPppoes.length === 0) {
          console.log("No user PPPoEs data provided");
          if (socket.connected) {
            socket.emit("/monitoring/activeMulti", {
              total: 0,
              data: [],
              timestamp: new Date().toISOString(),
              error: "No data provided"
            });
          }
          return;
        }

        console.log(`Processing ${userPppoes.length} user PPPoE request(s)`);

        // Process each server/user combination
        for (const [requestIndex, userPppoe] of userPppoes.entries()) {
          try {
            const server = userPppoe.server;
            const params = userPppoe.data?.param || "";

            if (!server?.ip || !server?.user || !server?.pass) {
              console.log(`Skipping request ${requestIndex}: Missing server credentials`);
              continue;
            }

            // Validasi format IP:Port
            const ipPort = server.ip.split(":");
            if (ipPort.length !== 2 || isNaN(ipPort[1])) {
              console.log(`Skipping request ${requestIndex}: Invalid IP format`);
              continue;
            }

            // Membuat kunci unik berbasis objek
            const connectionKey = JSON.stringify({
              ip: ipPort[0],
              port: parseInt(ipPort[1], 10),
              user: server.user,
              pass: server.pass,
            });

            const currentCred = {
              ip: ipPort[0],
              port: parseInt(ipPort[1], 10),
              user: server.user,
              pass: server.pass,
            };

            let conn;

            // Gunakan koneksi yang sudah ada atau buat baru
            if (this.conns.has(connectionKey)) {
              console.log(`Using existing connection for ${server.ip}`);
              conn = this.conns.get(connectionKey);

              // Cek status koneksi
              if (!conn.connected) {
                await conn.connect();
                console.log(`Reconnected to ${server.ip}`);
              }
            } else {
              console.log(`Creating new connection to ${server.ip}`);

              conn = new RouterOSAPI({
                host: currentCred.ip,
                port: currentCred.port,
                user: currentCred.user,
                password: currentCred.pass,
                keepalive: true,
              });

              // Event listeners
              conn
                .on("error", (err) => {
                  console.error(`Connection error [${currentCred.ip}]:`, err.message);
                })
                .on("close", () => {
                  console.log(`Connection closed to ${currentCred.ip}`);
                })
                .on("connected", () => {
                  console.log(`Connected to ${currentCred.ip}`);
                });

              // Connect with timeout
              await conn.connect();
              this.conns.set(connectionKey, conn);
            }

            // Get active connections for this server/param
            const paramArray = params ? [params] : [];
            const activeConnections = await conn.write("/ppp/active/print", paramArray);

            console.log(`Found ${activeConnections.length} active connection(s) for ${server.name} with param: ${params}`);

            // Process each active connection
            for (const activeConn of activeConnections) {
              let status = activeConn?.name ? "online" : "offline";
              let address = activeConn?.address || "N/A";
              let uptime = activeConn?.uptime || "N/A";
              let pppoeName =
                activeConn?.["service"] == "pppoe"
                  ? "<pppoe-" + activeConn?.name + ">"
                  : activeConn?.["service"] == "l2tp"
                    ? "<l2tp-" + activeConn?.name + ">"
                    : "";
              let ping = {};
              let traffic = {};

              if (status === "online" && pppoeName) {
                // Ping test
                try {
                  const pingResult = await conn.write("/ping", [
                    `=address=${activeConn?.address}`,
                    "=count=1",
                  ]);
                  ping = pingResult[0] || { status: "no-response" };
                } catch (error) {
                  console.error(`Ping error for ${activeConn?.name}:`, error.message);
                  ping = { status: "timeout" };
                }

                // Traffic monitoring
                try {
                  const trafficResult = await conn.write("/interface/monitor-traffic", [
                    `=interface=${pppoeName}`,
                    `=once=`,
                  ]);

                  traffic = {
                    rate:
                      (trafficResult?.[0]?.["rx-bits-per-second"] || 0) +
                      "/" +
                      (trafficResult?.[0]?.["tx-bits-per-second"] || 0),
                    rxBytes: trafficResult?.[0]?.["rx-bits-per-second"] || 0,
                    txBytes: trafficResult?.[0]?.["tx-bits-per-second"] || 0,
                  };
                } catch (error) {
                  console.error(`Traffic error for ${activeConn?.name}:`, error.message);
                  traffic = { rate: "0/0", rxBytes: 0, txBytes: 0 };
                }
              } else {
                ping = { status: "offline" };
                traffic = { rate: "0/0", rxBytes: 0, txBytes: 0 };
              }

              // Add to results
              allResults.push({
                name: activeConn?.name || "N/A",
                username: activeConn?.name || "N/A",
                status,
                router: server.name,
                serverIp: server.ip,
                address,
                uptime,
                service: activeConn?.["service"] || "N/A",
                traffic,
                ping,
                interface: pppoeName,
                requestParam: params,
                requestIndex: requestIndex,
              });
            }

          } catch (error) {
            console.error(`Error processing request ${requestIndex}:`, error.message);

            // Add error entry to results
            allResults.push({
              name: "ERROR",
              username: "ERROR",
              status: "error",
              router: userPppoe.server?.name || "Unknown",
              serverIp: userPppoe.server?.ip || "Unknown",
              address: "N/A",
              uptime: "N/A",
              service: "N/A",
              traffic: { rate: "0/0", rxBytes: 0, txBytes: 0 },
              ping: { status: "error" },
              interface: "N/A",
              requestParam: userPppoe.data?.param || "",
              requestIndex: requestIndex,
              error: error.message,
            });
          }
        }

        // Sort results by router name then by username
        const finalData = allResults.sort((a, b) => {
          const routerCompare = (a.router || "").localeCompare(b.router || "");
          if (routerCompare !== 0) return routerCompare;
          return (a.name || "").localeCompare(b.name || "");
        });

        socketData.hitung++;

        // Reset counter every 5 iterations
        if (socketData.hitung > 5) {
          socketData.hitung = 0;
        }

        console.log(
          `${socketData.hitung} /monitoring/activeMulti dikirim ke ${socketId} - ${finalData.length} total connections from ${userPppoes.length} requests`
        );

        // Group results by server for easier frontend handling
        const groupedByServer = {};
        finalData.forEach(item => {
          if (!groupedByServer[item.router]) {
            groupedByServer[item.router] = [];
          }
          groupedByServer[item.router].push(item);
        });

        // Double-check socket is still connected before emitting
        if (socket.connected) {
          socket.emit("/monitoring/activeMulti", {
            total: finalData.length,
            totalRequests: userPppoes.length,
            data: finalData,
            groupedByServer: groupedByServer,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Socket disconnected, clean up
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan - socket terputus`);
        }

      } catch (error) {
        console.error("Error in handleMonitoringActiveMulti:", error.message);

        // If there's an error, check if socket is still valid
        if (!socket.connected) {
          clearInterval(newIntervalId);
          this.activeIntervals.delete(socketId);
          socketData.isActive = false;
          console.log(`Interval untuk socket ${socketId} dihentikan karena error`);
        } else {
          socket.emit("/monitoring/activeMulti", {
            error: error.message,
            total: 0,
            totalRequests: 0,
            data: [],
            groupedByServer: {},
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, 1000);

    // Store interval with socket data for proper cleanup
    this.activeIntervals.set(socketId, {
      intervalId: newIntervalId,
      socketData: socketData,
      socket: socket
    });
  }
}

module.exports = WebsocketController;
