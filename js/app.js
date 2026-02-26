// 保存当前的转换结果数据
let currentResult = { lng: null, lat: null };
let currentFormat = 'decimal';
const HEIGHT_API_BASE_URL = 'https://height-translate.waku.icu';
const HEIGHT_DATUM_PRESETS = {
    '1985': { label: '1985国家高程系', offset: 0.000 },
    'guangzhou': { label: '广州高程基准', offset: 4.256 },
    '1956': { label: '1956黄海高程系', offset: -0.158 },
    'zhujiang': { label: '珠江高程基准', offset: -0.744 }
};
const HEIGHT_TYPE_OPTIONS = [
    { value: 'gps', label: 'GPS高度' },
    { value: '1985', label: '1985国家高程系' },
    { value: 'guangzhou', label: '广州高程基准' },
    { value: '1956', label: '1956黄海高程系' },
    { value: 'zhujiang', label: '珠江高程基准' }
];
let heightServiceStatusTimer = null;

// 清除错误信息
function clearErrors() {
    document.getElementById('singleLngError').textContent = '';
    document.getElementById('singleLatError').textContent = '';
    document.getElementById('batchError').textContent = '';
    document.getElementById('gz2000XError').textContent = '';
    document.getElementById('gz2000YError').textContent = '';
    // 广州平面
    const gxErr = document.getElementById('gzplaneXError'); if (gxErr) gxErr.textContent = '';
    const gyErr = document.getElementById('gzplaneYError'); if (gyErr) gyErr.textContent = '';
    // CGCS2000平面
    const cgXErr = document.getElementById('cgcs2000XError'); if (cgXErr) cgXErr.textContent = '';
    const cgYErr = document.getElementById('cgcs2000YError'); if (cgYErr) cgYErr.textContent = '';
    // DMS转换
    const dmsErr = document.getElementById('dmsError'); if (dmsErr) dmsErr.textContent = '';
    // 高程转换
    const hErr = document.getElementById('heightError'); if (hErr) hErr.textContent = '';
    const hLngErr = document.getElementById('heightLngError'); if (hLngErr) hLngErr.textContent = '';
    const hLatErr = document.getElementById('heightLatError'); if (hLatErr) hLatErr.textContent = '';
}

// 验证坐标
function validateCoordinates(lng, lat) {
    if (isNaN(lng) || isNaN(lat)) {
        return { valid: false, error: '请输入有效的数字' };
    }
    if (lng < -180 || lng > 180) {
        return { valid: false, error: '经度范围：-180° 到 180°' };
    }
    if (lat < -90 || lat > 90) {
        return { valid: false, error: '纬度范围：-90° 到 90°' };
    }
    return { valid: true };
}

// 大标签页切换
function switchMainTab(mainTabName) {
    // 隐藏所有大标签页区域
    const gcsArea = document.getElementById('gcsArea');
    const pcsArea = document.getElementById('pcsArea');
    const heightArea = document.getElementById('heightArea');
    const dmsArea = document.getElementById('dmsArea');
    if (gcsArea) gcsArea.style.display = 'none';
    if (pcsArea) pcsArea.style.display = 'none';
    if (heightArea) heightArea.style.display = 'none';
    if (dmsArea) dmsArea.style.display = 'none';

    // 移除所有大标签页active类
    document.querySelectorAll('.main-tabs .tab-btn').forEach(btn => {
        const currentTab = btn.getAttribute('data-main-tab');
        btn.classList.toggle('active', currentTab === mainTabName);
    });

    // 显示选中的大标签页
    if (mainTabName === 'gcs') {
        if (gcsArea) gcsArea.style.display = 'block';
        // 显示火星坐标系的第一个小标签页
        switchTab('single');
    } else if (mainTabName === 'pcs') {
        if (pcsArea) pcsArea.style.display = 'block';
        // 显示平面坐标系的第一个小标签页
        switchTab('gz2000');
    } else if (mainTabName === 'height') {
        if (heightArea) heightArea.style.display = 'block';
        checkHeightServiceStatus();
    } else if (mainTabName === 'dms') {
        if (dmsArea) dmsArea.style.display = 'block';
    }

    clearErrors();
}

// 标签页切换
function switchTab(tabName) {
    // 隐藏所有标签
    document.getElementById('singleTab').style.display = 'none';
    document.getElementById('batchTab').style.display = 'none';
    document.getElementById('gz2000Tab').style.display = 'none';
    document.getElementById('gzplaneTab').style.display = 'none';
    document.getElementById('cgcs2000Tab').style.display = 'none';

    // 隐藏所有info-box
    const gcsInfoBox = document.getElementById('gcsInfoBox');
    const gcsInfoBox2 = document.getElementById('gcsInfoBox2');
    if (gcsInfoBox) gcsInfoBox.style.display = 'none';
    if (gcsInfoBox2) gcsInfoBox2.style.display = 'none';

    // 获取当前活跃的小标签页容器
    const gcsArea = document.getElementById('gcsArea');
    const pcsArea = document.getElementById('pcsArea');
    const subTabs = gcsArea.style.display !== 'none' ? 
        document.querySelectorAll('#gcsArea .sub-tabs .tab-btn') : 
        document.querySelectorAll('#pcsArea .sub-tabs .tab-btn');

    // 移除所有小标签页active类
    subTabs.forEach(btn => {
        btn.classList.remove('active');
    });

    // 显示选中的标签
    if (tabName === 'single') {
        document.getElementById('singleTab').style.display = 'block';
        if (gcsArea.style.display !== 'none') {
            document.querySelectorAll('#gcsArea .sub-tabs .tab-btn')[0].classList.add('active');
        }
        if (gcsInfoBox) gcsInfoBox.style.display = 'block';
    } else if (tabName === 'batch') {
        document.getElementById('batchTab').style.display = 'block';
        if (gcsArea.style.display !== 'none') {
            document.querySelectorAll('#gcsArea .sub-tabs .tab-btn')[1].classList.add('active');
        }
        if (gcsInfoBox2) gcsInfoBox2.style.display = 'block';
    } else if (tabName === 'gz2000') {
        document.getElementById('gz2000Tab').style.display = 'block';
        if (pcsArea.style.display !== 'none') {
            document.querySelectorAll('#pcsArea .sub-tabs .tab-btn')[0].classList.add('active');
        }
    } else if (tabName === 'gzplane') {
        document.getElementById('gzplaneTab').style.display = 'block';
        if (pcsArea.style.display !== 'none') {
            document.querySelectorAll('#pcsArea .sub-tabs .tab-btn')[1].classList.add('active');
        }
    } else if (tabName === 'cgcs2000') {
        document.getElementById('cgcs2000Tab').style.display = 'block';
        if (pcsArea.style.display !== 'none') {
            document.querySelectorAll('#pcsArea .sub-tabs .tab-btn')[2].classList.add('active');
        }
    }

    clearErrors();
}

// 单条转换 - WGS84 → GCJ02
function convertSingleWgs84ToGcj02() {
    convertSingleWithDirection('wgs84-to-gcj02');
}

// 单条转换 - GCJ02 → WGS84
function convertSingleGcj02ToWgs84() {
    convertSingleWithDirection('gcj02-to-wgs84');
}

// 单条转换核心函数
function convertSingleWithDirection(direction) {
    clearErrors();
    const lng = parseFloat(document.getElementById('singleLng').value);
    const lat = parseFloat(document.getElementById('singleLat').value);

    const validation = validateCoordinates(lng, lat);
    if (!validation.valid) {
        document.getElementById('singleLngError').textContent = validation.error;
        document.getElementById('singleResultContainer').style.display = 'none';
        return;
    }

    let result;
    if (direction === 'wgs84-to-gcj02') {
        result = CoordinateTransform.wgs84ToGcj02(lng, lat);
    } else {
        result = CoordinateTransform.gcj02ToWgs84(lng, lat);
    }

    // 保存结果数据
    currentResult = { lng: result.lng, lat: result.lat };
    currentFormat = 'decimal';
    
    // 重置格式按钮
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-format') === 'decimal') {
            btn.classList.add('active');
        }
    });

    // 更新显示
    updateSingleResultDisplay();
    document.getElementById('singleResultContainer').style.display = 'block';
}

// 获取坐标值（根据当前格式）
function getFormattedValue(value, format) {
    switch(format) {
        case 'decimal':
            return value.toFixed(8);
        case 'dms':
            return decimalToDMS(value);
        case 'dm':
            return decimalToDM(value);
        default:
            return value.toFixed(8);
    }
}

// 十进制度数转度分秒格式
function decimalToDMS(decimal) {
    const isNegative = decimal < 0;
    const abs = Math.abs(decimal);
    
    const degrees = Math.floor(abs);
    const minutesDecimal = (abs - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);
    
    const sign = isNegative ? '-' : '';
    return `${sign}${degrees}°${minutes}'${seconds}"`;
}

// 十进制度数转度分格式
function decimalToDM(decimal) {
    const isNegative = decimal < 0;
    const abs = Math.abs(decimal);
    
    const degrees = Math.floor(abs);
    const minutes = ((abs - degrees) * 60).toFixed(4);
    
    const sign = isNegative ? '-' : '';
    return `${sign}${degrees}°${minutes}'`;
}

// 更新单条转换结果显示
function updateSingleResultDisplay() {
    if (!currentResult.lng || !currentResult.lat) return;

    const lngFormatted = getFormattedValue(currentResult.lng, currentFormat);
    const latFormatted = getFormattedValue(currentResult.lat, currentFormat);

    document.getElementById('singleResultLng').textContent = lngFormatted;
    document.getElementById('singleResultLat').textContent = latFormatted;
    
    // 坐标对格式
    if (currentFormat === 'decimal') {
        document.getElementById('singleResultCoord').textContent = currentResult.lng.toFixed(8) + ',' + currentResult.lat.toFixed(8);
    } else {
        document.getElementById('singleResultCoord').textContent = lngFormatted + ',' + latFormatted;
    }
}

// 切换显示格式
function changeDisplayFormat(format) {
    if (!currentResult.lng || !currentResult.lat) return;

    currentFormat = format;

    // 更新按钮样式
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-format') === format) {
            btn.classList.add('active');
        }
    });

    // 更新显示
    updateSingleResultDisplay();
    updateGz2000ResultDisplay();
    updateGzplaneResultDisplay();
    updateCgcs2000ResultDisplay();
}

// 更新广州2000转换结果显示
function updateGz2000ResultDisplay() {
    if (!currentResult.lng || !currentResult.lat) return;

    const lngFormatted = getFormattedValue(currentResult.lng, currentFormat);
    const latFormatted = getFormattedValue(currentResult.lat, currentFormat);

    document.getElementById('gz2000ResultLng').textContent = lngFormatted;
    document.getElementById('gz2000ResultLat').textContent = latFormatted;

    if (currentFormat === 'decimal') {
        document.getElementById('gz2000ResultCoord').textContent = currentResult.lng.toFixed(8) + ',' + currentResult.lat.toFixed(8);
    } else {
        document.getElementById('gz2000ResultCoord').textContent = lngFormatted + ',' + latFormatted;
    }
}

// 批量转换 - WGS84 → GCJ02
function convertBatchWgs84ToGcj02() {
    convertBatchWithDirection('wgs84-to-gcj02');
}

// 批量转换 - GCJ02 → WGS84
function convertBatchGcj02ToWgs84() {
    convertBatchWithDirection('gcj02-to-wgs84');
}

// 批量转换核心函数
function convertBatchWithDirection(direction) {
    clearErrors();
    const input = document.getElementById('batchInput').value.trim();

    if (!input) {
        document.getElementById('batchError').textContent = '请输入坐标数据';
        document.getElementById('batchResultContainer').style.display = 'none';
        return;
    }

    const lines = input.split('\n').filter(line => line.trim());
    const results = [];
    let errorCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 解析坐标（支持多种格式）
        let lng, lat;
        const parseResult = parseCoordinateLine(line);
        
        if (!parseResult.valid) {
            results.push(`# 第 ${i + 1} 行：${parseResult.error}`);
            errorCount++;
            continue;
        }

        lng = parseResult.lng;
        lat = parseResult.lat;

        const validation = validateCoordinates(lng, lat);
        if (!validation.valid) {
            results.push(`# 第 ${i + 1} 行：${validation.error}`);
            errorCount++;
            continue;
        }

        let result;
        if (direction === 'wgs84-to-gcj02') {
            result = CoordinateTransform.wgs84ToGcj02(lng, lat);
        } else {
            result = CoordinateTransform.gcj02ToWgs84(lng, lat);
        }

        results.push(result.lng.toFixed(8) + ',' + result.lat.toFixed(8));
    }

    if (results.length === 0) {
        document.getElementById('batchError').textContent = '没有有效的坐标数据';
        document.getElementById('batchResultContainer').style.display = 'none';
        return;
    }

    const output = results.join('\n');
    document.getElementById('batchResultOutput').value = output;
    document.getElementById('batchResultCount').textContent = (results.length - errorCount);

    if (errorCount > 0) {
        document.getElementById('batchError').textContent = `警告：有 ${errorCount} 行数据转换失败，已在结果中标记`;
    }

    document.getElementById('batchResultContainer').style.display = 'block';
}

// 解析坐标行（支持多种格式）
function parseCoordinateLine(line) {
    // 去除首尾空格
    line = line.trim();

    // 检查是否是奥维格式（g开头）
    if (line.startsWith('g') || line.startsWith('G')) {
        line = line.substring(1).trim();
    }

    // 尝试用逗号分隔
    if (line.includes(',')) {
        const coords = line.split(',').map(s => s.trim());
        if (coords.length === 2) {
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            if (!isNaN(lng) && !isNaN(lat)) {
                return { valid: true, lng, lat };
            }
        }
    }

    // 尝试用空格分隔
    const coords = line.split(/\s+/);
    if (coords.length === 2) {
        const lng = parseFloat(coords[0]);
        const lat = parseFloat(coords[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
            return { valid: true, lng, lat };
        }
    }

    return { valid: false, error: '格式错误' };
}

// 复制到剪贴板
function copyToClipboard(elementId, button) {
    let text;
    const element = document.getElementById(elementId);
    
    if (element.tagName === 'TEXTAREA') {
        text = element.value;
    } else {
        text = element.textContent;
    }

    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '已复制!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        alert('复制失败，请手动复制');
    });
}

// 按 Enter 键时执行转换
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'singleLng' || activeElement.id === 'singleLat') {
            convertSingleWithDirection('wgs84-to-gcj02');
        } else if (activeElement.id === 'gz2000X' || activeElement.id === 'gz2000Y') {
            convertGz2000ToWgs84();
        } else if (activeElement.id === 'gzplaneX' || activeElement.id === 'gzplaneY') {
            convertGzPlaneToWgs84();
        } else if (activeElement.id === 'cgcs2000X' || activeElement.id === 'cgcs2000Y') {
            convertCgcs2000PlaneToWgs84();
        } else if (
            activeElement.id === 'heightLng' ||
            activeElement.id === 'heightLat' ||
            activeElement.id === 'heightValue' ||
            activeElement.id === 'heightInputType' ||
            activeElement.id === 'heightOutputType' ||
            activeElement.id === 'heightCustomOffset'
        ) {
            convertHeight();
        }
    }
});

// 广州2000转换（广州2000 -> WGS84经纬度）
function convertGz2000ToWgs84() {
    clearErrors();
    const x = parseFloat(document.getElementById('gz2000X').value);
    const y = parseFloat(document.getElementById('gz2000Y').value);

    // 验证坐标
    if (isNaN(x) || isNaN(y)) {
        document.getElementById('gz2000XError').textContent = '请输入有效的数字';
        document.getElementById('gz2000ResultContainer').style.display = 'none';
        return;
    }

    // 调用完整转换：广州2000 -> WGS84经纬度
    const latlng = CoordinateTransform.gz2000ToWgs84LatLng(x, y);

    // 保存并显示（支持显示格式切换）
    currentResult = { lng: latlng.lng, lat: latlng.lat };
    currentFormat = 'decimal';
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-format') === 'decimal') btn.classList.add('active');
    });
    updateGz2000ResultDisplay();
    document.getElementById('gz2000ResultContainer').style.display = 'block';
}

// 广州平面 -> WGS84 经纬度（按：广州平面 -> 西安80平面(四参数) -> WGS84经纬度）
function convertGzPlaneToWgs84() {
    clearErrors();
    const x = parseFloat(document.getElementById('gzplaneX').value);
    const y = parseFloat(document.getElementById('gzplaneY').value);

    if (isNaN(x) || isNaN(y)) {
        document.getElementById('gzplaneXError').textContent = '请输入有效的数字';
        document.getElementById('gzplaneResultContainer').style.display = 'none';
        return;
    }

    // 调用转换链
    const latlng = CoordinateTransform.gzPlaneToWgs84LatLng(x, y);

    currentResult = { lng: latlng.lng, lat: latlng.lat };
    currentFormat = 'decimal';

    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-format') === 'decimal') btn.classList.add('active');
    });

    updateGzplaneResultDisplay();
    document.getElementById('gzplaneResultContainer').style.display = 'block';
}

// CGCS2000平面 -> WGS84 经纬度
function convertCgcs2000PlaneToWgs84() {
    clearErrors();
    const x = parseFloat(document.getElementById('cgcs2000X').value);
    const y = parseFloat(document.getElementById('cgcs2000Y').value);

    if (isNaN(x) || isNaN(y)) {
        document.getElementById('cgcs2000XError').textContent = '请输入有效的数字';
        document.getElementById('cgcs2000ResultContainer').style.display = 'none';
        return;
    }

    const latlng = CoordinateTransform.cgcs2000PlaneToWgs84LatLng(x, y);

    currentResult = { lng: latlng.lng, lat: latlng.lat };
    currentFormat = 'decimal';

    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-format') === 'decimal') btn.classList.add('active');
    });

    updateCgcs2000ResultDisplay();
    document.getElementById('cgcs2000ResultContainer').style.display = 'block';
}

// Backward compatibility aliases
function convertGz2000ToCgcs2000() {
    return convertGz2000ToWgs84();
}

function convertGzPlaneToCgcs2000() {
    return convertGzPlaneToWgs84();
}

// 更新广州平面转换结果显示
function updateGzplaneResultDisplay() {
    if (!currentResult.lng || !currentResult.lat) return;

    const lngFormatted = getFormattedValue(currentResult.lng, currentFormat);
    const latFormatted = getFormattedValue(currentResult.lat, currentFormat);

    document.getElementById('gzplaneResultLng').textContent = lngFormatted;
    document.getElementById('gzplaneResultLat').textContent = latFormatted;

    if (currentFormat === 'decimal') {
        document.getElementById('gzplaneResultCoord').textContent = currentResult.lng.toFixed(8) + ',' + currentResult.lat.toFixed(8);
    } else {
        document.getElementById('gzplaneResultCoord').textContent = lngFormatted + ',' + latFormatted;
    }
}

// 更新CGCS2000平面转换结果显示
function updateCgcs2000ResultDisplay() {
    if (!currentResult.lng || !currentResult.lat) return;

    const lngFormatted = getFormattedValue(currentResult.lng, currentFormat);
    const latFormatted = getFormattedValue(currentResult.lat, currentFormat);

    document.getElementById('cgcs2000ResultLng').textContent = lngFormatted;
    document.getElementById('cgcs2000ResultLat').textContent = latFormatted;

    if (currentFormat === 'decimal') {
        document.getElementById('cgcs2000ResultCoord').textContent = currentResult.lng.toFixed(8) + ',' + currentResult.lat.toFixed(8);
    } else {
        document.getElementById('cgcs2000ResultCoord').textContent = lngFormatted + ',' + latFormatted;
    }
}

// 自动检测并解析角度字符串为十进制度（支持小数/度分/度分秒）
function parseAngleToDecimal(input) {
    if (!input || input.trim() === '') return NaN;
    input = input.trim();

    // 先尝试作为小数直接解析（无任何分隔符或单位符）
    if (!input.match(/[°º\'′"″\s]/)) {
        // 纯粹的数字+小数点+负号
        const v = parseFloat(input);
        return isNaN(v) ? NaN : v;
    }

    // 有分隔符，需要分解为度/分/秒
    // 将常见符号替换为空格，保留数字、点、负号
    const cleaned = input.replace(/[°º]/g, ' ').replace(/["″]/g, ' ').replace(/[\'′]/g, ' ');
    const parts = cleaned.split(/[^0-9.\-]+/).filter(s => s !== '');
    if (parts.length === 0) return NaN;

    const sign = input.trim().startsWith('-') ? -1 : 1;
    const deg = parseFloat(parts[0]);
    if (isNaN(deg)) return NaN;

    let decimal = Math.abs(deg);
    if (parts.length >= 2) {
        const min = parseFloat(parts[1]);
        if (!isNaN(min)) decimal += min / 60;
    }
    if (parts.length >= 3) {
        const sec = parseFloat(parts[2]);
        if (!isNaN(sec)) decimal += sec / 3600;
    }

    return sign * decimal;
}

// 将输入转换并显示为小数/度分秒/度分（自动识别格式）
function convertDmsInput() {
    clearErrors();
    const input = document.getElementById('dmsInput').value;

    const dec = parseAngleToDecimal(input);
    if (isNaN(dec)) {
        document.getElementById('dmsError').textContent = '无法解析输入，请检查格式';
        document.getElementById('dmsResultContainer').style.display = 'none';
        return;
    }

    document.getElementById('dmsResultDecimal').textContent = dec.toFixed(8);
    document.getElementById('dmsResultDMS').textContent = decimalToDMS(dec);
    document.getElementById('dmsResultDM').textContent = decimalToDM(dec);
    document.getElementById('dmsResultContainer').style.display = 'block';
}

function getHeightTypeLabel(type) {
    if (type === 'gps') return 'GPS高度';
    const preset = HEIGHT_DATUM_PRESETS[type];
    return preset ? preset.label : '目标高度';
}

function refreshHeightOutputOptions() {
    const inputTypeEl = document.getElementById('heightInputType');
    const outputTypeEl = document.getElementById('heightOutputType');
    const resultLabelEl = document.getElementById('heightResultLabel');

    if (!inputTypeEl || !outputTypeEl) return;

    const inputType = inputTypeEl.value;
    const currentOutput = outputTypeEl.value;
    const available = HEIGHT_TYPE_OPTIONS.filter(option => option.value !== inputType);

    outputTypeEl.innerHTML = '';
    available.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        outputTypeEl.appendChild(opt);
    });

    if (available.some(option => option.value === currentOutput)) {
        outputTypeEl.value = currentOutput;
    }

    if (resultLabelEl) {
        resultLabelEl.textContent = `${getHeightTypeLabel(outputTypeEl.value)}：`;
    }
}

function parseOptionalInputNumber(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return null;

    const text = element.value.trim();
    if (text === '') return null;

    const value = parseFloat(text);
    return Number.isFinite(value) ? value : NaN;
}

function parseHeightCoordinate(text) {
    if (!text || text.trim() === '') return NaN;
    const value = parseAngleToDecimal(text.trim());
    return Number.isFinite(value) ? value : NaN;
}

function setHeightButtonsDisabled(disabled) {
    document.querySelectorAll('.height-convert-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.65' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
}

function formatHeightValue(value) {
    return `${value.toFixed(4)} m`;
}

function setHeightServiceStatus(isHealthy) {
    const dotEl = document.getElementById('heightServiceStatusDot');
    const textEl = document.getElementById('heightServiceStatusText');
    if (!dotEl || !textEl) return;

    dotEl.classList.remove('status-green', 'status-red');
    if (isHealthy) {
        dotEl.classList.add('status-green');
        textEl.textContent = '后端服务正常';
    } else {
        dotEl.classList.add('status-red');
        textEl.textContent = '后端服务故障';
    }
}

function getPresetOffset(type) {
    const preset = HEIGHT_DATUM_PRESETS[type];
    return preset ? preset.offset : NaN;
}

async function checkHeightServiceStatus() {
    const url = new URL('/health', HEIGHT_API_BASE_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            signal: controller.signal
        });
        if (!response.ok) {
            setHeightServiceStatus(false);
            return;
        }

        const data = await response.json();
        setHeightServiceStatus(data && data.status === 'ok');
    } catch (_) {
        setHeightServiceStatus(false);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchGeoidUndulation(lat, lon) {
    const url = new URL('/api/v1/geoid/undulation', HEIGHT_API_BASE_URL);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));

    const response = await fetch(url.toString(), { method: 'GET' });

    let data = null;
    try {
        data = await response.json();
    } catch (_) {
        data = null;
    }

    if (!response.ok) {
        const detail = data && data.detail ? data.detail : `HTTP ${response.status}`;
        throw new Error(`高程接口请求失败：${detail}`);
    }

    if (!data || typeof data.undulation_m !== 'number' || !Number.isFinite(data.undulation_m)) {
        throw new Error('高程接口返回格式不正确');
    }

    return data;
}

async function convertHeight() {
    clearErrors();

    const resultContainer = document.getElementById('heightResultContainer');
    const errorEl = document.getElementById('heightError');
    const lngErrorEl = document.getElementById('heightLngError');
    const latErrorEl = document.getElementById('heightLatError');

    const lngRaw = document.getElementById('heightLng').value;
    const latRaw = document.getElementById('heightLat').value;
    const lng = parseHeightCoordinate(lngRaw);
    const lat = parseHeightCoordinate(latRaw);

    const heightValue = parseOptionalInputNumber('heightValue');
    const inputType = document.getElementById('heightInputType').value;
    const outputType = document.getElementById('heightOutputType').value;
    const customOffset = parseOptionalInputNumber('heightCustomOffset');

    const llValidation = validateCoordinates(lng, lat);
    if (!llValidation.valid) {
        if (lngErrorEl) lngErrorEl.textContent = '经度格式或范围错误';
        if (latErrorEl) latErrorEl.textContent = '纬度格式或范围错误';
        if (resultContainer) resultContainer.style.display = 'none';
        return;
    }

    if (!inputType || !outputType || inputType === outputType) {
        if (errorEl) errorEl.textContent = '请选择有效的输入类型和目标类型';
        if (resultContainer) resultContainer.style.display = 'none';
        return;
    }

    if (heightValue === null || Number.isNaN(heightValue)) {
        if (errorEl) errorEl.textContent = '请输入有效的高度值';
        if (resultContainer) resultContainer.style.display = 'none';
        return;
    }

    if (Number.isNaN(customOffset)) {
        if (errorEl) errorEl.textContent = '自定义差值格式错误';
        if (resultContainer) resultContainer.style.display = 'none';
        return;
    }

    if (errorEl) errorEl.textContent = '正在转换...';
    setHeightButtonsDisabled(true);

    try {
        const geoid = await fetchGeoidUndulation(lat, lng);
        const N = geoid.undulation_m;
        const hasCustomOffset = customOffset !== null;

        let inputOffset = inputType === 'gps' ? null : getPresetOffset(inputType);
        let outputOffset = outputType === 'gps' ? null : getPresetOffset(outputType);

        if (hasCustomOffset) {
            if (inputType === 'gps' && outputType !== 'gps') {
                outputOffset = customOffset;
            } else if (outputType === 'gps' && inputType !== 'gps') {
                inputOffset = customOffset;
            } else if (inputType !== 'gps' && outputType !== 'gps') {
                outputOffset = customOffset;
            }
        }

        let h1985;
        if (inputType === 'gps') {
            h1985 = heightValue - N;
        } else {
            h1985 = heightValue - inputOffset;
        }

        let outputValue;
        if (outputType === 'gps') {
            outputValue = h1985 + N;
        } else {
            outputValue = h1985 + outputOffset;
        }

        const resultLabelEl = document.getElementById('heightResultLabel');
        if (resultLabelEl) {
            resultLabelEl.textContent = `${getHeightTypeLabel(outputType)}：`;
        }
        document.getElementById('heightResultValue').textContent = formatHeightValue(outputValue);
        setHeightServiceStatus(true);

        if (resultContainer) resultContainer.style.display = 'block';
        if (errorEl) errorEl.textContent = '';
    } catch (error) {
        const message = error instanceof Error ? error.message : '高程转换失败';
        if (errorEl) errorEl.textContent = message;
        setHeightServiceStatus(false);
        if (resultContainer) resultContainer.style.display = 'none';
    } finally {
        setHeightButtonsDisabled(false);
    }
}

// 初始化高程类型联动
(function initHeightConverter() {
    const inputTypeEl = document.getElementById('heightInputType');
    const outputTypeEl = document.getElementById('heightOutputType');

    if (inputTypeEl) {
        inputTypeEl.addEventListener('change', refreshHeightOutputOptions);
    }
    if (outputTypeEl) {
        outputTypeEl.addEventListener('change', refreshHeightOutputOptions);
    }

    refreshHeightOutputOptions();
    checkHeightServiceStatus();
    if (!heightServiceStatusTimer) {
        heightServiceStatusTimer = setInterval(checkHeightServiceStatus, 30000);
    }
})();
