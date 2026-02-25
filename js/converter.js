/**
 * 坐标转换工具
 * GCJ02（高德、腾讯）与 WGS84（GPS原始坐标）转换
 */

const CoordinateTransform = {
    // 常数定义
    EARTHRADIUS: 6370996.81,
    PI: Math.PI,
    MCBAND: [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
    MC2LL: [
        [1.289059486E7, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
        [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
        [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
        [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0]
    ],
    LL2MC: [
        [1.289059486E7, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
        [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
        [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0],
        [12890595.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0]
    ],

    // WGS84 转 GCJ02
    wgs84ToGcj02(lng, lat) {
        if (this.isOutOfChina(lng, lat)) {
            return { lng, lat };
        }

        let dLat = this.transformLat(lng - 105.0, lat - 35.0);
        let dLng = this.transformLng(lng - 105.0, lat - 35.0);
        let radLat = lat / 180.0 * this.PI;
        let magic = Math.sin(radLat);
        magic = 1 - 0.00669342162296594323 * magic * magic;
        let sqrtMagic = Math.sqrt(magic);

        dLat = (dLat * 180.0) / ((this.EARTHRADIUS * (1 - 0.00669342162296594323)) / (magic * sqrtMagic) * this.PI);
        dLng = (dLng * 180.0) / (this.EARTHRADIUS / sqrtMagic * Math.cos(radLat) * this.PI);

        let gcjLat = lat + dLat;
        let gcjLng = lng + dLng;

        return { lng: gcjLng, lat: gcjLat };
    },

    // GCJ02 转 WGS84
    gcj02ToWgs84(lng, lat) {
        if (this.isOutOfChina(lng, lat)) {
            return { lng, lat };
        }

        let dLat = this.transformLat(lng - 105.0, lat - 35.0);
        let dLng = this.transformLng(lng - 105.0, lat - 35.0);
        let radLat = lat / 180.0 * this.PI;
        let magic = Math.sin(radLat);
        magic = 1 - 0.00669342162296594323 * magic * magic;
        let sqrtMagic = Math.sqrt(magic);

        dLat = (dLat * 180.0) / ((this.EARTHRADIUS * (1 - 0.00669342162296594323)) / (magic * sqrtMagic) * this.PI);
        dLng = (dLng * 180.0) / (this.EARTHRADIUS / sqrtMagic * Math.cos(radLat) * this.PI);

        let wgsLat = lat - dLat;
        let wgsLng = lng - dLng;

        return { lng: wgsLng, lat: wgsLat };
    },

    // 检查是否在中国范围内
    isOutOfChina(lng, lat) {
        if (lng < 73.56 || lng > 135.05 || lat < 3.51 || lat > 53.56) {
            return true;
        }
        return false;
    },

    // 转换纬度
    transformLat(lng, lat) {
        let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
        ret += ((20.0 * Math.sin(6.0 * lng * this.PI) + 20.0 * Math.sin(2.0 * lng * this.PI)) * 2.0) / 3.0;
        ret += ((20.0 * Math.sin(lat * this.PI) + 40.0 * Math.sin(lat / 3.0 * this.PI)) * 2.0) / 3.0;
        ret += ((160.0 * Math.sin(lat / 12.0 * this.PI) + 320 * Math.sin(lat * this.PI / 30.0)) * 2.0) / 3.0;
        return ret;
    },

    // 转换经度
    transformLng(lng, lat) {
        let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
        ret += ((20.0 * Math.sin(6.0 * lng * this.PI) + 20.0 * Math.sin(2.0 * lng * this.PI)) * 2.0) / 3.0;
        ret += ((20.0 * Math.sin(lng * this.PI) + 40.0 * Math.sin(lng / 3.0 * this.PI)) * 2.0) / 3.0;
        ret += ((150.0 * Math.sin(lng / 12.0 * this.PI) + 300.0 * Math.sin(lng / 30.0 * this.PI)) * 2.0) / 3.0;
        return ret;
    },

    // ================== Guangzhou 2000 PCS 转换函数 ==================

    // 四参数转换：广州2000平面坐标 → CGCS2000平面坐标
    // 参数：x, y（广州2000平面坐标）
    fourParamTransform(x, y) {
        // 四参数转换参数
        const Dx = 2329988.522159;
        const Dy = 385501.065534;
        // 原始 T 单位为"秒"（角秒），先转换为度再转换为弧度：秒 -> 度 = /3600
        const T = 1000.26464558 / 3600.0 * Math.PI / 180.0; // 转换为弧度
        const K = 1.000035376261;

        const cosT = Math.cos(T);
        const sinT = Math.sin(T);

        // 逆向四参数转换：从广州2000到CGCS2000
        const X_cgcs = Dx + K * (x * cosT - y * sinT);
        const Y_cgcs = Dy + K * (x * sinT + y * cosT);

        return { x: X_cgcs, y: Y_cgcs };
    },

    // 高斯克吕格投影逆变换：CGCS2000平面坐标(EPSG:4547) → CGCS2000经纬度(EPSG:4490)
    // 中央经线：114°，不带带号的平面坐标
    // 坐标系约定：X正方向是北，Y正方向是东
    gaussToLatLng(X, Y) {
        // Ellipsoid (GRS80 / CGCS2000)
        const a = 6378137.0;
        const invF = 298.257222101;
        const f = 1 / invF;
        const e2 = 2 * f - f * f;          // first eccentricity squared
        const ep2 = e2 / (1 - e2);         // second eccentricity squared

        // ---- Projection parameters (EPSG:4547) ----
        const lon0 = 114 * Math.PI / 180;  // central meridian in radians
        const k0 = 1.0;                    // scale factor
        const FE = 500000.0;               // false easting
        const FN = 0.0;                    // false northing

        // ---- Optional: strip zone prefix in Y (带号) ----
        // 常见规则：Y = zone*1,000,000 + 500,000 + easting
        // EPSG:4547 本身是“截断形式”（通常不带 zone*1,000,000），但工程数据里经常会带。:contentReference[oaicite:3]{index=3}
        let y = Y;
        if (Math.abs(y) >= 1_000_000) {
            const zone = Math.floor(Math.abs(y) / 1_000_000);
            y = y - Math.sign(y) * zone * 1_000_000;
        }

        // ---- Inverse Transverse Mercator ----
        const E = (y - FE) / k0;
        const M = (X - FN) / k0;

        const e4 = e2 * e2;
        const e6 = e4 * e2;

        const mu = M / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));
        const sqrt1me2 = Math.sqrt(1 - e2);
        const e1 = (1 - sqrt1me2) / (1 + sqrt1me2);

        const e1_2 = e1 * e1;
        const e1_3 = e1_2 * e1;
        const e1_4 = e1_2 * e1_2;

        const J1 = (3 * e1 / 2) - (27 * e1_3 / 32);
        const J2 = (21 * e1_2 / 16) - (55 * e1_4 / 32);
        const J3 = (151 * e1_3 / 96);
        const J4 = (1097 * e1_4 / 512);

        const fp = mu
            + J1 * Math.sin(2 * mu)
            + J2 * Math.sin(4 * mu)
            + J3 * Math.sin(6 * mu)
            + J4 * Math.sin(8 * mu);

        const sinfp = Math.sin(fp);
        const cosfp = Math.cos(fp);
        const tanfp = Math.tan(fp);

        const C1 = ep2 * cosfp * cosfp;
        const T1 = tanfp * tanfp;

        const N1 = a / Math.sqrt(1 - e2 * sinfp * sinfp);
        const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinfp * sinfp, 1.5);

        const D = E / N1;

        const D2 = D * D;
        const D3 = D2 * D;
        const D4 = D2 * D2;
        const D5 = D4 * D;
        const D6 = D3 * D3;

        const latRad = fp - (N1 * tanfp / R1) * (
            D2 / 2
            - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D4 / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D6 / 720
        );

        const lonRad = lon0 + (
            D
            - (1 + 2 * T1 + C1) * D3 / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D5 / 120
        ) / cosfp;

        const lat = latRad * 180 / Math.PI;
        const lng = lonRad * 180 / Math.PI;

        return { lng, lat };
    },


    // 辅助：CGCS2000经纬度 -> WGS84经纬度（无七参数时按同一ECEF坐标转换椭球）
    cgcs2000ToWgs84LatLng(lng, lat) {
        const ecef = this.geodeticToEcef(lat, lng, 0, 6378137.0, 298.257222101); // GRS80/CGCS2000
        const wgs84 = this.ecefToGeodetic(ecef.X, ecef.Y, ecef.Z, 6378137.0, 298.257223563); // WGS84
        return { lng: wgs84.lon, lat: wgs84.lat };
    },

    // 广州2000平面坐标 -> WGS84经纬度（先到CGCS2000，再换算到WGS84）
    gz2000ToWgs84LatLng(x, y) {
        // 第一步：四参数转换
        const cgcsCoord = this.fourParamTransform(x, y);

        // 第二步：高斯克吕格投影逆变换（得到CGCS2000经纬度）
        const cgcsLatLng = this.gaussToLatLng(cgcsCoord.x, cgcsCoord.y);

        // 第三步：CGCS2000 -> WGS84
        return this.cgcs2000ToWgs84LatLng(cgcsLatLng.lng, cgcsLatLng.lat);
    },

    // ============== 新增：广州平面 -> 西安80平面(四参数) -> WGS84经纬度 ==============

    // 广州平面坐标 -> 西安80平面坐标（四参数法，用户提供参数）
    gzPlaneToXian80Plane(x, y) {
        // 使用用户提供的四参数
        const Dx = 2529995.146137;
        const Dy = 38386472.523543;
        const T = 0.004835; // 单位：弧度（用户已给出）
        const K = 1.00001624203784;

        const cosT = Math.cos(T);
        const sinT = Math.sin(T);

        const X_xian = Dx + K * (x * cosT - y * sinT);
        const Y_xian = Dy + K * (x * sinT + y * cosT);

        return { x: X_xian, y: Y_xian };
    },

    // 高斯克吕格逆变换（西安80，IAG-75 椭球）
    gaussToLatLngXian(X, Y) {
        // Ellipsoid IAG-75
        const a = 6378140.0;
        const invF = 298.257;
        const f = 1 / invF;
        const e2 = 2 * f - f * f;
        const ep2 = e2 / (1 - e2);

        // 带号处理（如果 Y 带带号则去除并计算中央经线）
        let y = Y;
        let lon0Deg = 114; // 默认中央子午线
        if (Math.abs(y) >= 1_000_000) {
            const zone = Math.floor(Math.abs(y) / 1_000_000);
            y = y - Math.sign(y) * zone * 1_000_000;
            lon0Deg = zone * 3; // 3度带的中央经线
        }

        const lon0 = lon0Deg * Math.PI / 180;
        const k0 = 1.0; // scale factor
        const FE = 500000.0; // false easting
        const FN = 0.0; // false northing

        // ---- Inverse Transverse Mercator ----

        const E = (y - FE) / k0;
        const M = (X - FN) / k0;

        const e4 = e2 * e2;
        const e6 = e4 * e2;

        const mu = M / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));
        const sqrt1me2 = Math.sqrt(1 - e2);
        const e1 = (1 - sqrt1me2) / (1 + sqrt1me2);

        const e1_2 = e1 * e1;
        const e1_3 = e1_2 * e1;
        const e1_4 = e1_2 * e1_2;

        const J1 = (3 * e1 / 2) - (27 * e1_3 / 32);
        const J2 = (21 * e1_2 / 16) - (55 * e1_4 / 32);
        const J3 = (151 * e1_3 / 96);
        const J4 = (1097 * e1_4 / 512);

        const fp = mu
            + J1 * Math.sin(2 * mu)
            + J2 * Math.sin(4 * mu)
            + J3 * Math.sin(6 * mu)
            + J4 * Math.sin(8 * mu);

        const sinfp = Math.sin(fp);
        const cosfp = Math.cos(fp);
        const tanfp = Math.tan(fp);

        const C1 = ep2 * cosfp * cosfp;
        const T1 = tanfp * tanfp;

        const N1 = a / Math.sqrt(1 - e2 * sinfp * sinfp);
        const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinfp * sinfp, 1.5);

        const D = E / N1;

        const D2 = D * D;
        const D3 = D2 * D;
        const D4 = D2 * D2;
        const D5 = D4 * D;
        const D6 = D3 * D3;

        const latRad = fp - (N1 * tanfp / R1) * (
            D2 / 2
            - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D4 / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D6 / 720
        );

        const lonRad = lon0 + (
            D
            - (1 + 2 * T1 + C1) * D3 / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D5 / 120
        ) / cosfp;

        const lat = latRad * 180 / Math.PI;
        const lng = lonRad * 180 / Math.PI;

        return { lng, lat };
    },

    // 辅助：大地坐标 -> 地心直角坐标 (ECEF)
    geodeticToEcef(latDeg, lonDeg, h, a, invF) {
        const lat = latDeg * Math.PI / 180;
        const lon = lonDeg * Math.PI / 180;
        const f = 1 / invF;
        const e2 = 2 * f - f * f;
        const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
        const X = (N + h) * Math.cos(lat) * Math.cos(lon);
        const Y = (N + h) * Math.cos(lat) * Math.sin(lon);
        const Z = (N * (1 - e2) + h) * Math.sin(lat);
        return { X, Y, Z };
    },

    // 辅助：ECEF -> 大地坐标（迭代法），返回 lat, lon, h
    ecefToGeodetic(X, Y, Z, a, invF) {
        const lon = Math.atan2(Y, X);
        const f = 1 / invF;
        const e2 = 2 * f - f * f;
        const eps = e2 / (1 - e2);

        const p = Math.sqrt(X * X + Y * Y);
        let lat = Math.atan2(Z, p * (1 - e2));
        let N, h;
        for (let i = 0; i < 10; i++) {
            N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
            h = p / Math.cos(lat) - N;
            const latNext = Math.atan2(Z, p * (1 - e2 * (N / (N + h))));
            if (Math.abs(latNext - lat) < 1e-12) {
                lat = latNext;
                break;
            }
            lat = latNext;
        }

        return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI, h };
    },

    // 组合函数：西安80平面坐标（IAG-75） -> WGS84经纬度（通过 ECEF 在两椭球间转换，假设无平移）
    xian80PlaneToWgs84LatLng(X, Y) {
        // 1) 西安80平面 -> 西安80（IAG-75）大地坐标
        const latlng_xian = this.gaussToLatLngXian(X, Y);

        // 2) IAG-75 大地坐标 -> ECEF (a=6378140.0, invF=298.257)
        const ecef = this.geodeticToEcef(latlng_xian.lat, latlng_xian.lng, 0, 6378140.0, 298.257);

        // 3) 假设没有平移/旋转/尺度差（若有须提供七参数），直接在 ECEF 空间上按 WGS84 椭球转换为经纬
        const latlon_wgs84 = this.ecefToGeodetic(ecef.X, ecef.Y, ecef.Z, 6378137.0, 298.257223563);

        return { lng: latlon_wgs84.lon, lat: latlon_wgs84.lat };
    },

    // 终级组合：广州平面 -> 西安80平面(四参数) -> WGS84经纬度
    gzPlaneToWgs84LatLng(x, y) {
        const xianPlane = this.gzPlaneToXian80Plane(x, y);
        return this.xian80PlaneToWgs84LatLng(xianPlane.x, xianPlane.y);
    },

    // Backward compatibility aliases
    gz2000ToCgcs2000LatLng(x, y) {
        return this.gz2000ToWgs84LatLng(x, y);
    },

    xian80PlaneToCgcs2000LatLng(X, Y) {
        return this.xian80PlaneToWgs84LatLng(X, Y);
    },

    gzPlaneToCgcs2000LatLng(x, y) {
        return this.gzPlaneToWgs84LatLng(x, y);
    }
};
