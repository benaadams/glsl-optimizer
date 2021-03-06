var Module;
if (!Module) Module = (typeof Module !== "undefined" ? Module : null) || {};
var moduleOverrides = {};
for (var key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function";
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
 if (!Module["print"]) Module["print"] = function print(x) {
  process["stdout"].write(x + "\n");
 };
 if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
  process["stderr"].write(x + "\n");
 };
 var nodeFS = require("fs");
 var nodePath = require("path");
 Module["read"] = function read(filename, binary) {
  filename = nodePath["normalize"](filename);
  var ret = nodeFS["readFileSync"](filename);
  if (!ret && filename != nodePath["resolve"](filename)) {
   filename = path.join(__dirname, "..", "src", filename);
   ret = nodeFS["readFileSync"](filename);
  }
  if (ret && !binary) ret = ret.toString();
  return ret;
 };
 Module["readBinary"] = function readBinary(filename) {
  return Module["read"](filename, true);
 };
 Module["load"] = function load(f) {
  globalEval(read(f));
 };
 if (!Module["thisProgram"]) {
  if (process["argv"].length > 1) {
   Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
  } else {
   Module["thisProgram"] = "unknown-program";
  }
 }
 Module["arguments"] = process["argv"].slice(2);
 if (typeof module !== "undefined") {
  module["exports"] = Module;
 }
 process["on"]("uncaughtException", (function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 }));
} else if (ENVIRONMENT_IS_SHELL) {
 if (!Module["print"]) Module["print"] = print;
 if (typeof printErr != "undefined") Module["printErr"] = printErr;
 if (typeof read != "undefined") {
  Module["read"] = read;
 } else {
  Module["read"] = function read() {
   throw "no read() available (jsc?)";
  };
 }
 Module["readBinary"] = function readBinary(f) {
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  var data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 Module["read"] = function read(url) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.responseText;
 };
 if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof console !== "undefined") {
  if (!Module["print"]) Module["print"] = function print(x) {
   console.log(x);
  };
  if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
   console.log(x);
  };
 } else {
  var TRY_USE_DUMP = false;
  if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
   dump(x);
  }) : (function(x) {});
 }
 if (ENVIRONMENT_IS_WORKER) {
  Module["load"] = importScripts;
 }
 if (typeof Module["setWindowTitle"] === "undefined") {
  Module["setWindowTitle"] = (function(title) {
   document.title = title;
  });
 }
} else {
 throw "Unknown runtime environment. Where are we?";
}
function globalEval(x) {
 eval.call(null, x);
}
if (!Module["load"] && Module["read"]) {
 Module["load"] = function load(f) {
  globalEval(Module["read"](f));
 };
}
if (!Module["print"]) {
 Module["print"] = (function() {});
}
if (!Module["printErr"]) {
 Module["printErr"] = Module["print"];
}
if (!Module["arguments"]) {
 Module["arguments"] = [];
}
if (!Module["thisProgram"]) {
 Module["thisProgram"] = "./this.program";
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (var key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}
var Runtime = {
 setTempRet0: (function(value) {
  tempRet0 = value;
 }),
 getTempRet0: (function() {
  return tempRet0;
 }),
 stackSave: (function() {
  return STACKTOP;
 }),
 stackRestore: (function(stackTop) {
  STACKTOP = stackTop;
 }),
 getNativeTypeSize: (function(type) {
  switch (type) {
  case "i1":
  case "i8":
   return 1;
  case "i16":
   return 2;
  case "i32":
   return 4;
  case "i64":
   return 8;
  case "float":
   return 4;
  case "double":
   return 8;
  default:
   {
    if (type[type.length - 1] === "*") {
     return Runtime.QUANTUM_SIZE;
    } else if (type[0] === "i") {
     var bits = parseInt(type.substr(1));
     assert(bits % 8 === 0);
     return bits / 8;
    } else {
     return 0;
    }
   }
  }
 }),
 getNativeFieldSize: (function(type) {
  return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
 }),
 STACK_ALIGN: 16,
 getAlignSize: (function(type, size, vararg) {
  if (!vararg && (type == "i64" || type == "double")) return 8;
  if (!type) return Math.min(size, 8);
  return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
 }),
 dynCall: (function(sig, ptr, args) {
  if (args && args.length) {
   if (!args.splice) args = Array.prototype.slice.call(args);
   args.splice(0, 0, ptr);
   return Module["dynCall_" + sig].apply(null, args);
  } else {
   return Module["dynCall_" + sig].call(null, ptr);
  }
 }),
 functionPointers: [],
 addFunction: (function(func) {
  for (var i = 0; i < Runtime.functionPointers.length; i++) {
   if (!Runtime.functionPointers[i]) {
    Runtime.functionPointers[i] = func;
    return 2 * (1 + i);
   }
  }
  throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.";
 }),
 removeFunction: (function(index) {
  Runtime.functionPointers[(index - 2) / 2] = null;
 }),
 getAsmConst: (function(code, numArgs) {
  if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
  var func = Runtime.asmConstCache[code];
  if (func) return func;
  var args = [];
  for (var i = 0; i < numArgs; i++) {
   args.push(String.fromCharCode(36) + i);
  }
  var source = Pointer_stringify(code);
  if (source[0] === '"') {
   if (source.indexOf('"', 1) === source.length - 1) {
    source = source.substr(1, source.length - 2);
   } else {
    abort("invalid EM_ASM input |" + source + "|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)");
   }
  }
  try {
   var evalled = eval("(function(Module, FS) { return function(" + args.join(",") + "){ " + source + " } })")(Module, typeof FS !== "undefined" ? FS : null);
  } catch (e) {
   Module.printErr("error in executing inline EM_ASM code: " + e + " on: \n\n" + source + "\n\nwith args |" + args + "| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)");
   throw e;
  }
  return Runtime.asmConstCache[code] = evalled;
 }),
 warnOnce: (function(text) {
  if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
  if (!Runtime.warnOnce.shown[text]) {
   Runtime.warnOnce.shown[text] = 1;
   Module.printErr(text);
  }
 }),
 funcWrappers: {},
 getFuncWrapper: (function(func, sig) {
  assert(sig);
  if (!Runtime.funcWrappers[sig]) {
   Runtime.funcWrappers[sig] = {};
  }
  var sigCache = Runtime.funcWrappers[sig];
  if (!sigCache[func]) {
   sigCache[func] = function dynCall_wrapper() {
    return Runtime.dynCall(sig, func, arguments);
   };
  }
  return sigCache[func];
 }),
 getCompilerSetting: (function(name) {
  throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work";
 }),
 stackAlloc: (function(size) {
  var ret = STACKTOP;
  STACKTOP = STACKTOP + size | 0;
  STACKTOP = STACKTOP + 15 & -16;
  return ret;
 }),
 staticAlloc: (function(size) {
  var ret = STATICTOP;
  STATICTOP = STATICTOP + size | 0;
  STATICTOP = STATICTOP + 15 & -16;
  return ret;
 }),
 dynamicAlloc: (function(size) {
  var ret = DYNAMICTOP;
  DYNAMICTOP = DYNAMICTOP + size | 0;
  DYNAMICTOP = DYNAMICTOP + 15 & -16;
  if (DYNAMICTOP >= TOTAL_MEMORY) {
   var success = enlargeMemory();
   if (!success) return 0;
  }
  return ret;
 }),
 alignMemory: (function(size, quantum) {
  var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
  return ret;
 }),
 makeBigInt: (function(low, high, unsigned) {
  var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
  return ret;
 }),
 GLOBAL_BASE: 2048,
 QUANTUM_SIZE: 4,
 __dummy__: 0
};
Module["Runtime"] = Runtime;
var __THREW__ = 0;
var ABORT = false;
var EXITSTATUS = 0;
var undef = 0;
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}
var globalScope = this;
function getCFunc(ident) {
 var func = Module["_" + ident];
 if (!func) {
  try {
   func = eval("_" + ident);
  } catch (e) {}
 }
 assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
 return func;
}
var cwrap, ccall;
((function() {
 var JSfuncs = {
  "stackSave": (function() {
   Runtime.stackSave();
  }),
  "stackRestore": (function() {
   Runtime.stackRestore();
  }),
  "arrayToC": (function(arr) {
   var ret = Runtime.stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }),
  "stringToC": (function(str) {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    ret = Runtime.stackAlloc((str.length << 2) + 1);
    writeStringToMemory(str, ret);
   }
   return ret;
  })
 };
 var toC = {
  "string": JSfuncs["stringToC"],
  "array": JSfuncs["arrayToC"]
 };
 ccall = function ccallFunc(ident, returnType, argTypes, args) {
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
   for (var i = 0; i < args.length; i++) {
    var converter = toC[argTypes[i]];
    if (converter) {
     if (stack === 0) stack = Runtime.stackSave();
     cArgs[i] = converter(args[i]);
    } else {
     cArgs[i] = args[i];
    }
   }
  }
  var ret = func.apply(null, cArgs);
  if (returnType === "string") ret = Pointer_stringify(ret);
  if (stack !== 0) Runtime.stackRestore(stack);
  return ret;
 };
 var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
 function parseJSFunc(jsfunc) {
  var parsed = jsfunc.toString().match(sourceRegex).slice(1);
  return {
   arguments: parsed[0],
   body: parsed[1],
   returnValue: parsed[2]
  };
 }
 var JSsource = {};
 for (var fun in JSfuncs) {
  if (JSfuncs.hasOwnProperty(fun)) {
   JSsource[fun] = parseJSFunc(JSfuncs[fun]);
  }
 }
 cwrap = function cwrap(ident, returnType, argTypes) {
  argTypes = argTypes || [];
  var cfunc = getCFunc(ident);
  var numericArgs = argTypes.every((function(type) {
   return type === "number";
  }));
  var numericRet = returnType !== "string";
  if (numericRet && numericArgs) {
   return cfunc;
  }
  var argNames = argTypes.map((function(x, i) {
   return "$" + i;
  }));
  var funcstr = "(function(" + argNames.join(",") + ") {";
  var nargs = argTypes.length;
  if (!numericArgs) {
   funcstr += "var stack = " + JSsource["stackSave"].body + ";";
   for (var i = 0; i < nargs; i++) {
    var arg = argNames[i], type = argTypes[i];
    if (type === "number") continue;
    var convertCode = JSsource[type + "ToC"];
    funcstr += "var " + convertCode.arguments + " = " + arg + ";";
    funcstr += convertCode.body + ";";
    funcstr += arg + "=" + convertCode.returnValue + ";";
   }
  }
  var cfuncname = parseJSFunc((function() {
   return cfunc;
  })).returnValue;
  funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
  if (!numericRet) {
   var strgfy = parseJSFunc((function() {
    return Pointer_stringify;
   })).returnValue;
   funcstr += "ret = " + strgfy + "(ret);";
  }
  if (!numericArgs) {
   funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";";
  }
  funcstr += "return ret})";
  return eval(funcstr);
 };
}))();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;
function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  break;
 case "i8":
  HEAP8[ptr >> 0] = value;
  break;
 case "i16":
  HEAP16[ptr >> 1] = value;
  break;
 case "i32":
  HEAP32[ptr >> 2] = value;
  break;
 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0) ], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  break;
 case "float":
  HEAPF32[ptr >> 2] = value;
  break;
 case "double":
  HEAPF64[ptr >> 3] = value;
  break;
 default:
  abort("invalid type for setValue: " + type);
 }
}
Module["setValue"] = setValue;
function getValue(ptr, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  return HEAP8[ptr >> 0];
 case "i8":
  return HEAP8[ptr >> 0];
 case "i16":
  return HEAP16[ptr >> 1];
 case "i32":
  return HEAP32[ptr >> 2];
 case "i64":
  return HEAP32[ptr >> 2];
 case "float":
  return HEAPF32[ptr >> 2];
 case "double":
  return HEAPF64[ptr >> 3];
 default:
  abort("invalid type for setValue: " + type);
 }
 return null;
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;
function allocate(slab, types, allocator, ptr) {
 var zeroinit, size;
 if (typeof slab === "number") {
  zeroinit = true;
  size = slab;
 } else {
  zeroinit = false;
  size = slab.length;
 }
 var singleType = typeof types === "string" ? types : null;
 var ret;
 if (allocator == ALLOC_NONE) {
  ret = ptr;
 } else {
  ret = [ _malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc ][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
 }
 if (zeroinit) {
  var ptr = ret, stop;
  assert((ret & 3) == 0);
  stop = ret + (size & ~3);
  for (; ptr < stop; ptr += 4) {
   HEAP32[ptr >> 2] = 0;
  }
  stop = ret + size;
  while (ptr < stop) {
   HEAP8[ptr++ >> 0] = 0;
  }
  return ret;
 }
 if (singleType === "i8") {
  if (slab.subarray || slab.slice) {
   HEAPU8.set(slab, ret);
  } else {
   HEAPU8.set(new Uint8Array(slab), ret);
  }
  return ret;
 }
 var i = 0, type, typeSize, previousType;
 while (i < size) {
  var curr = slab[i];
  if (typeof curr === "function") {
   curr = Runtime.getFunctionIndex(curr);
  }
  type = singleType || types[i];
  if (type === 0) {
   i++;
   continue;
  }
  if (type == "i64") type = "i32";
  setValue(ret + i, curr, type);
  if (previousType !== type) {
   typeSize = Runtime.getNativeTypeSize(type);
   previousType = type;
  }
  i += typeSize;
 }
 return ret;
}
Module["allocate"] = allocate;
function Pointer_stringify(ptr, length) {
 if (length === 0 || !ptr) return "";
 var hasUtf = 0;
 var t;
 var i = 0;
 while (1) {
  t = HEAPU8[ptr + i >> 0];
  hasUtf |= t;
  if (t == 0 && !length) break;
  i++;
  if (length && i == length) break;
 }
 if (!length) length = i;
 var ret = "";
 if (hasUtf < 128) {
  var MAX_CHUNK = 1024;
  var curr;
  while (length > 0) {
   curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
   ret = ret ? ret + curr : curr;
   ptr += MAX_CHUNK;
   length -= MAX_CHUNK;
  }
  return ret;
 }
 return Module["UTF8ToString"](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;
function AsciiToString(ptr) {
 var str = "";
 while (1) {
  var ch = HEAP8[ptr++ >> 0];
  if (!ch) return str;
  str += String.fromCharCode(ch);
 }
}
Module["AsciiToString"] = AsciiToString;
function stringToAscii(str, outPtr) {
 return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;
function UTF8ArrayToString(u8Array, idx) {
 var u0, u1, u2, u3, u4, u5;
 var str = "";
 while (1) {
  u0 = u8Array[idx++];
  if (!u0) return str;
  if (!(u0 & 128)) {
   str += String.fromCharCode(u0);
   continue;
  }
  u1 = u8Array[idx++] & 63;
  if ((u0 & 224) == 192) {
   str += String.fromCharCode((u0 & 31) << 6 | u1);
   continue;
  }
  u2 = u8Array[idx++] & 63;
  if ((u0 & 240) == 224) {
   u0 = (u0 & 15) << 12 | u1 << 6 | u2;
  } else {
   u3 = u8Array[idx++] & 63;
   if ((u0 & 248) == 240) {
    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
   } else {
    u4 = u8Array[idx++] & 63;
    if ((u0 & 252) == 248) {
     u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
    } else {
     u5 = u8Array[idx++] & 63;
     u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
    }
   }
  }
  if (u0 < 65536) {
   str += String.fromCharCode(u0);
  } else {
   var ch = u0 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  }
 }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;
function UTF8ToString(ptr) {
 return UTF8ArrayToString(HEAPU8, ptr);
}
Module["UTF8ToString"] = UTF8ToString;
function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   outU8Array[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   outU8Array[outIdx++] = 192 | u >> 6;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   outU8Array[outIdx++] = 224 | u >> 12;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 2097151) {
   if (outIdx + 3 >= endIdx) break;
   outU8Array[outIdx++] = 240 | u >> 18;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 67108863) {
   if (outIdx + 4 >= endIdx) break;
   outU8Array[outIdx++] = 248 | u >> 24;
   outU8Array[outIdx++] = 128 | u >> 18 & 63;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 5 >= endIdx) break;
   outU8Array[outIdx++] = 252 | u >> 30;
   outU8Array[outIdx++] = 128 | u >> 24 & 63;
   outU8Array[outIdx++] = 128 | u >> 18 & 63;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  }
 }
 outU8Array[outIdx] = 0;
 return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;
function stringToUTF8(str, outPtr, maxBytesToWrite) {
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;
function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) {
   ++len;
  } else if (u <= 2047) {
   len += 2;
  } else if (u <= 65535) {
   len += 3;
  } else if (u <= 2097151) {
   len += 4;
  } else if (u <= 67108863) {
   len += 5;
  } else {
   len += 6;
  }
 }
 return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;
function UTF16ToString(ptr) {
 var i = 0;
 var str = "";
 while (1) {
  var codeUnit = HEAP16[ptr + i * 2 >> 1];
  if (codeUnit == 0) return str;
  ++i;
  str += String.fromCharCode(codeUnit);
 }
}
Module["UTF16ToString"] = UTF16ToString;
function stringToUTF16(str, outPtr, maxBytesToWrite) {
 if (maxBytesToWrite === undefined) {
  maxBytesToWrite = 2147483647;
 }
 if (maxBytesToWrite < 2) return 0;
 maxBytesToWrite -= 2;
 var startPtr = outPtr;
 var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
 for (var i = 0; i < numCharsToWrite; ++i) {
  var codeUnit = str.charCodeAt(i);
  HEAP16[outPtr >> 1] = codeUnit;
  outPtr += 2;
 }
 HEAP16[outPtr >> 1] = 0;
 return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;
function lengthBytesUTF16(str) {
 return str.length * 2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;
function UTF32ToString(ptr) {
 var i = 0;
 var str = "";
 while (1) {
  var utf32 = HEAP32[ptr + i * 4 >> 2];
  if (utf32 == 0) return str;
  ++i;
  if (utf32 >= 65536) {
   var ch = utf32 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  } else {
   str += String.fromCharCode(utf32);
  }
 }
}
Module["UTF32ToString"] = UTF32ToString;
function stringToUTF32(str, outPtr, maxBytesToWrite) {
 if (maxBytesToWrite === undefined) {
  maxBytesToWrite = 2147483647;
 }
 if (maxBytesToWrite < 4) return 0;
 var startPtr = outPtr;
 var endPtr = startPtr + maxBytesToWrite - 4;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) {
   var trailSurrogate = str.charCodeAt(++i);
   codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
  }
  HEAP32[outPtr >> 2] = codeUnit;
  outPtr += 4;
  if (outPtr + 4 > endPtr) break;
 }
 HEAP32[outPtr >> 2] = 0;
 return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;
function lengthBytesUTF32(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
  len += 4;
 }
 return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;
function demangle(func) {
 var hasLibcxxabi = !!Module["___cxa_demangle"];
 if (hasLibcxxabi) {
  try {
   var buf = _malloc(func.length);
   writeStringToMemory(func.substr(1), buf);
   var status = _malloc(4);
   var ret = Module["___cxa_demangle"](buf, 0, 0, status);
   if (getValue(status, "i32") === 0 && ret) {
    return Pointer_stringify(ret);
   }
  } catch (e) {} finally {
   if (buf) _free(buf);
   if (status) _free(status);
   if (ret) _free(ret);
  }
 }
 var i = 3;
 var basicTypes = {
  "v": "void",
  "b": "bool",
  "c": "char",
  "s": "short",
  "i": "int",
  "l": "long",
  "f": "float",
  "d": "double",
  "w": "wchar_t",
  "a": "signed char",
  "h": "unsigned char",
  "t": "unsigned short",
  "j": "unsigned int",
  "m": "unsigned long",
  "x": "long long",
  "y": "unsigned long long",
  "z": "..."
 };
 var subs = [];
 var first = true;
 function dump(x) {
  if (x) Module.print(x);
  Module.print(func);
  var pre = "";
  for (var a = 0; a < i; a++) pre += " ";
  Module.print(pre + "^");
 }
 function parseNested() {
  i++;
  if (func[i] === "K") i++;
  var parts = [];
  while (func[i] !== "E") {
   if (func[i] === "S") {
    i++;
    var next = func.indexOf("_", i);
    var num = func.substring(i, next) || 0;
    parts.push(subs[num] || "?");
    i = next + 1;
    continue;
   }
   if (func[i] === "C") {
    parts.push(parts[parts.length - 1]);
    i += 2;
    continue;
   }
   var size = parseInt(func.substr(i));
   var pre = size.toString().length;
   if (!size || !pre) {
    i--;
    break;
   }
   var curr = func.substr(i + pre, size);
   parts.push(curr);
   subs.push(curr);
   i += pre + size;
  }
  i++;
  return parts;
 }
 function parse(rawList, limit, allowVoid) {
  limit = limit || Infinity;
  var ret = "", list = [];
  function flushList() {
   return "(" + list.join(", ") + ")";
  }
  var name;
  if (func[i] === "N") {
   name = parseNested().join("::");
   limit--;
   if (limit === 0) return rawList ? [ name ] : name;
  } else {
   if (func[i] === "K" || first && func[i] === "L") i++;
   var size = parseInt(func.substr(i));
   if (size) {
    var pre = size.toString().length;
    name = func.substr(i + pre, size);
    i += pre + size;
   }
  }
  first = false;
  if (func[i] === "I") {
   i++;
   var iList = parse(true);
   var iRet = parse(true, 1, true);
   ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">";
  } else {
   ret = name;
  }
  paramLoop : while (i < func.length && limit-- > 0) {
   var c = func[i++];
   if (c in basicTypes) {
    list.push(basicTypes[c]);
   } else {
    switch (c) {
    case "P":
     list.push(parse(true, 1, true)[0] + "*");
     break;
    case "R":
     list.push(parse(true, 1, true)[0] + "&");
     break;
    case "L":
     {
      i++;
      var end = func.indexOf("E", i);
      var size = end - i;
      list.push(func.substr(i, size));
      i += size + 2;
      break;
     }
    case "A":
     {
      var size = parseInt(func.substr(i));
      i += size.toString().length;
      if (func[i] !== "_") throw "?";
      i++;
      list.push(parse(true, 1, true)[0] + " [" + size + "]");
      break;
     }
    case "E":
     break paramLoop;
    default:
     ret += "?" + c;
     break paramLoop;
    }
   }
  }
  if (!allowVoid && list.length === 1 && list[0] === "void") list = [];
  if (rawList) {
   if (ret) {
    list.push(ret + "?");
   }
   return list;
  } else {
   return ret + flushList();
  }
 }
 var parsed = func;
 try {
  if (func == "Object._main" || func == "_main") {
   return "main()";
  }
  if (typeof func === "number") func = Pointer_stringify(func);
  if (func[0] !== "_") return func;
  if (func[1] !== "_") return func;
  if (func[2] !== "Z") return func;
  switch (func[3]) {
  case "n":
   return "operator new()";
  case "d":
   return "operator delete()";
  }
  parsed = parse();
 } catch (e) {
  parsed += "?";
 }
 if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
  Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
 }
 return parsed;
}
function demangleAll(text) {
 return text.replace(/__Z[\w\d_]+/g, (function(x) {
  var y = demangle(x);
  return x === y ? x : x + " [" + y + "]";
 }));
}
function jsStackTrace() {
 var err = new Error;
 if (!err.stack) {
  try {
   throw new Error(0);
  } catch (e) {
   err = e;
  }
  if (!err.stack) {
   return "(no stack trace available)";
  }
 }
 return err.stack.toString();
}
function stackTrace() {
 return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
 if (x % 4096 > 0) {
  x += 4096 - x % 4096;
 }
 return x;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false;
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0;
var DYNAMIC_BASE = 0, DYNAMICTOP = 0;
function enlargeMemory() {
 abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.");
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 33554432;
var totalMemory = 64 * 1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
 if (totalMemory < 16 * 1024 * 1024) {
  totalMemory *= 2;
 } else {
  totalMemory += 16 * 1024 * 1024;
 }
}
if (totalMemory !== TOTAL_MEMORY) {
 Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec (and given that TOTAL_STACK=" + TOTAL_STACK + ")");
 TOTAL_MEMORY = totalMemory;
}
assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Runtime.dynCall("v", func);
   } else {
    Runtime.dynCall("vi", func, [ callback.arg ]);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
 callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
 callRuntimeCallbacks(__ATEXIT__);
 runtimeExited = true;
}
function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}
Module["addOnInit"] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
 __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;
function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}
Module["intArrayFromString"] = intArrayFromString;
function intArrayToString(array) {
 var ret = [];
 for (var i = 0; i < array.length; i++) {
  var chr = array[i];
  if (chr > 255) {
   chr &= 255;
  }
  ret.push(String.fromCharCode(chr));
 }
 return ret.join("");
}
Module["intArrayToString"] = intArrayToString;
function writeStringToMemory(string, buffer, dontAddNull) {
 var array = intArrayFromString(string, dontAddNull);
 var i = 0;
 while (i < array.length) {
  var chr = array[i];
  HEAP8[buffer + i >> 0] = chr;
  i = i + 1;
 }
}
Module["writeStringToMemory"] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
 for (var i = 0; i < array.length; i++) {
  HEAP8[buffer++ >> 0] = array[i];
 }
}
Module["writeArrayToMemory"] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; ++i) {
  HEAP8[buffer++ >> 0] = str.charCodeAt(i);
 }
 if (!dontAddNull) HEAP8[buffer >> 0] = 0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;
function unSign(value, bits, ignore) {
 if (value >= 0) {
  return value;
 }
 return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}
function reSign(value, bits, ignore) {
 if (value <= 0) {
  return value;
 }
 var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
 if (value >= half && (bits <= 32 || value > half)) {
  value = -2 * half + value;
 }
 return value;
}
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) Math["imul"] = function imul(a, b) {
 var ah = a >>> 16;
 var al = a & 65535;
 var bh = b >>> 16;
 var bl = b & 65535;
 return al * bl + (ah * bl + al * bh << 16) | 0;
};
Math.imul = Math["imul"];
if (!Math["clz32"]) Math["clz32"] = (function(x) {
 x = x >>> 0;
 for (var i = 0; i < 32; i++) {
  if (x & 1 << 31 - i) return i;
 }
 return 32;
});
Math.clz32 = Math["clz32"];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}
Module["addRunDependency"] = addRunDependency;
function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
STATIC_BASE = 2048;
STATICTOP = STATIC_BASE + 2409104;
var EMTSTACKTOP = STATIC_BASE + 1360512, EMT_STACK_MAX = EMTSTACKTOP + 1048576;
__ATINIT__.push({
 func: (function() {
  __GLOBAL__sub_I_builtin_functions_cpp();
 })
}, {
 func: (function() {
  __GLOBAL__sub_I_builtin_types_cpp();
 })
}, {
 func: (function() {
  __GLOBAL__sub_I_iostream_cpp();
 })
});
var memoryInitializer = "glsl-optimizer.js.mem";
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) {
 HEAP8[tempDoublePtr] = HEAP8[ptr];
 HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
 HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
 HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
}
function copyTempDouble(ptr) {
 HEAP8[tempDoublePtr] = HEAP8[ptr];
 HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
 HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
 HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
 HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
 HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
 HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
 HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7];
}
function _atexit(func, arg) {
 __ATEXIT__.unshift({
  func: func,
  arg: arg
 });
}
function ___cxa_atexit() {
 return _atexit.apply(null, arguments);
}
Module["_i64Add"] = _i64Add;
Module["_i64Subtract"] = _i64Subtract;
var _fabsf = Math_abs;
var _floorf = Math_floor;
function __ZSt18uncaught_exceptionv() {
 return !!__ZSt18uncaught_exceptionv.uncaught_exception;
}
var EXCEPTIONS = {
 last: 0,
 caught: [],
 infos: {},
 deAdjust: (function(adjusted) {
  if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
  for (var ptr in EXCEPTIONS.infos) {
   var info = EXCEPTIONS.infos[ptr];
   if (info.adjusted === adjusted) {
    return ptr;
   }
  }
  return adjusted;
 }),
 addRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  info.refcount++;
 }),
 decRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  assert(info.refcount > 0);
  info.refcount--;
  if (info.refcount === 0) {
   if (info.destructor) {
    Runtime.dynCall("vi", info.destructor, [ ptr ]);
   }
   delete EXCEPTIONS.infos[ptr];
   ___cxa_free_exception(ptr);
  }
 }),
 clearRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  info.refcount = 0;
 })
};
function ___resumeException(ptr) {
 if (!EXCEPTIONS.last) {
  EXCEPTIONS.last = ptr;
 }
 EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr));
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
function ___cxa_find_matching_catch() {
 var thrown = EXCEPTIONS.last;
 if (!thrown) {
  return (asm["setTempRet0"](0), 0) | 0;
 }
 var info = EXCEPTIONS.infos[thrown];
 var throwntype = info.type;
 if (!throwntype) {
  return (asm["setTempRet0"](0), thrown) | 0;
 }
 var typeArray = Array.prototype.slice.call(arguments);
 var pointer = Module["___cxa_is_pointer_type"](throwntype);
 if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
 HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
 thrown = ___cxa_find_matching_catch.buffer;
 for (var i = 0; i < typeArray.length; i++) {
  if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
   thrown = HEAP32[thrown >> 2];
   info.adjusted = thrown;
   return (asm["setTempRet0"](typeArray[i]), thrown) | 0;
  }
 }
 thrown = HEAP32[thrown >> 2];
 return (asm["setTempRet0"](throwntype), thrown) | 0;
}
function ___cxa_throw(ptr, type, destructor) {
 EXCEPTIONS.infos[ptr] = {
  ptr: ptr,
  adjusted: ptr,
  type: type,
  destructor: destructor,
  refcount: 0
 };
 EXCEPTIONS.last = ptr;
 if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
  __ZSt18uncaught_exceptionv.uncaught_exception = 1;
 } else {
  __ZSt18uncaught_exceptionv.uncaught_exception++;
 }
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
function _pthread_mutex_lock() {}
var ERRNO_CODES = {
 EPERM: 1,
 ENOENT: 2,
 ESRCH: 3,
 EINTR: 4,
 EIO: 5,
 ENXIO: 6,
 E2BIG: 7,
 ENOEXEC: 8,
 EBADF: 9,
 ECHILD: 10,
 EAGAIN: 11,
 EWOULDBLOCK: 11,
 ENOMEM: 12,
 EACCES: 13,
 EFAULT: 14,
 ENOTBLK: 15,
 EBUSY: 16,
 EEXIST: 17,
 EXDEV: 18,
 ENODEV: 19,
 ENOTDIR: 20,
 EISDIR: 21,
 EINVAL: 22,
 ENFILE: 23,
 EMFILE: 24,
 ENOTTY: 25,
 ETXTBSY: 26,
 EFBIG: 27,
 ENOSPC: 28,
 ESPIPE: 29,
 EROFS: 30,
 EMLINK: 31,
 EPIPE: 32,
 EDOM: 33,
 ERANGE: 34,
 ENOMSG: 42,
 EIDRM: 43,
 ECHRNG: 44,
 EL2NSYNC: 45,
 EL3HLT: 46,
 EL3RST: 47,
 ELNRNG: 48,
 EUNATCH: 49,
 ENOCSI: 50,
 EL2HLT: 51,
 EDEADLK: 35,
 ENOLCK: 37,
 EBADE: 52,
 EBADR: 53,
 EXFULL: 54,
 ENOANO: 55,
 EBADRQC: 56,
 EBADSLT: 57,
 EDEADLOCK: 35,
 EBFONT: 59,
 ENOSTR: 60,
 ENODATA: 61,
 ETIME: 62,
 ENOSR: 63,
 ENONET: 64,
 ENOPKG: 65,
 EREMOTE: 66,
 ENOLINK: 67,
 EADV: 68,
 ESRMNT: 69,
 ECOMM: 70,
 EPROTO: 71,
 EMULTIHOP: 72,
 EDOTDOT: 73,
 EBADMSG: 74,
 ENOTUNIQ: 76,
 EBADFD: 77,
 EREMCHG: 78,
 ELIBACC: 79,
 ELIBBAD: 80,
 ELIBSCN: 81,
 ELIBMAX: 82,
 ELIBEXEC: 83,
 ENOSYS: 38,
 ENOTEMPTY: 39,
 ENAMETOOLONG: 36,
 ELOOP: 40,
 EOPNOTSUPP: 95,
 EPFNOSUPPORT: 96,
 ECONNRESET: 104,
 ENOBUFS: 105,
 EAFNOSUPPORT: 97,
 EPROTOTYPE: 91,
 ENOTSOCK: 88,
 ENOPROTOOPT: 92,
 ESHUTDOWN: 108,
 ECONNREFUSED: 111,
 EADDRINUSE: 98,
 ECONNABORTED: 103,
 ENETUNREACH: 101,
 ENETDOWN: 100,
 ETIMEDOUT: 110,
 EHOSTDOWN: 112,
 EHOSTUNREACH: 113,
 EINPROGRESS: 115,
 EALREADY: 114,
 EDESTADDRREQ: 89,
 EMSGSIZE: 90,
 EPROTONOSUPPORT: 93,
 ESOCKTNOSUPPORT: 94,
 EADDRNOTAVAIL: 99,
 ENETRESET: 102,
 EISCONN: 106,
 ENOTCONN: 107,
 ETOOMANYREFS: 109,
 EUSERS: 87,
 EDQUOT: 122,
 ESTALE: 116,
 ENOTSUP: 95,
 ENOMEDIUM: 123,
 EILSEQ: 84,
 EOVERFLOW: 75,
 ECANCELED: 125,
 ENOTRECOVERABLE: 131,
 EOWNERDEAD: 130,
 ESTRPIPE: 86
};
var ERRNO_MESSAGES = {
 0: "Success",
 1: "Not super-user",
 2: "No such file or directory",
 3: "No such process",
 4: "Interrupted system call",
 5: "I/O error",
 6: "No such device or address",
 7: "Arg list too long",
 8: "Exec format error",
 9: "Bad file number",
 10: "No children",
 11: "No more processes",
 12: "Not enough core",
 13: "Permission denied",
 14: "Bad address",
 15: "Block device required",
 16: "Mount device busy",
 17: "File exists",
 18: "Cross-device link",
 19: "No such device",
 20: "Not a directory",
 21: "Is a directory",
 22: "Invalid argument",
 23: "Too many open files in system",
 24: "Too many open files",
 25: "Not a typewriter",
 26: "Text file busy",
 27: "File too large",
 28: "No space left on device",
 29: "Illegal seek",
 30: "Read only file system",
 31: "Too many links",
 32: "Broken pipe",
 33: "Math arg out of domain of func",
 34: "Math result not representable",
 35: "File locking deadlock error",
 36: "File or path name too long",
 37: "No record locks available",
 38: "Function not implemented",
 39: "Directory not empty",
 40: "Too many symbolic links",
 42: "No message of desired type",
 43: "Identifier removed",
 44: "Channel number out of range",
 45: "Level 2 not synchronized",
 46: "Level 3 halted",
 47: "Level 3 reset",
 48: "Link number out of range",
 49: "Protocol driver not attached",
 50: "No CSI structure available",
 51: "Level 2 halted",
 52: "Invalid exchange",
 53: "Invalid request descriptor",
 54: "Exchange full",
 55: "No anode",
 56: "Invalid request code",
 57: "Invalid slot",
 59: "Bad font file fmt",
 60: "Device not a stream",
 61: "No data (for no delay io)",
 62: "Timer expired",
 63: "Out of streams resources",
 64: "Machine is not on the network",
 65: "Package not installed",
 66: "The object is remote",
 67: "The link has been severed",
 68: "Advertise error",
 69: "Srmount error",
 70: "Communication error on send",
 71: "Protocol error",
 72: "Multihop attempted",
 73: "Cross mount point (not really error)",
 74: "Trying to read unreadable message",
 75: "Value too large for defined data type",
 76: "Given log. name not unique",
 77: "f.d. invalid for this operation",
 78: "Remote address changed",
 79: "Can   access a needed shared lib",
 80: "Accessing a corrupted shared lib",
 81: ".lib section in a.out corrupted",
 82: "Attempting to link in too many libs",
 83: "Attempting to exec a shared library",
 84: "Illegal byte sequence",
 86: "Streams pipe error",
 87: "Too many users",
 88: "Socket operation on non-socket",
 89: "Destination address required",
 90: "Message too long",
 91: "Protocol wrong type for socket",
 92: "Protocol not available",
 93: "Unknown protocol",
 94: "Socket type not supported",
 95: "Not supported",
 96: "Protocol family not supported",
 97: "Address family not supported by protocol family",
 98: "Address already in use",
 99: "Address not available",
 100: "Network interface is not configured",
 101: "Network is unreachable",
 102: "Connection reset by network",
 103: "Connection aborted",
 104: "Connection reset by peer",
 105: "No buffer space available",
 106: "Socket is already connected",
 107: "Socket is not connected",
 108: "Can't send after socket shutdown",
 109: "Too many references",
 110: "Connection timed out",
 111: "Connection refused",
 112: "Host is down",
 113: "Host is unreachable",
 114: "Socket already connected",
 115: "Connection already in progress",
 116: "Stale file handle",
 122: "Quota exceeded",
 123: "No medium (in tape drive)",
 125: "Operation canceled",
 130: "Previous owner died",
 131: "State not recoverable"
};
var ___errno_state = 0;
function ___setErrNo(value) {
 HEAP32[___errno_state >> 2] = value;
 return value;
}
var PATH = {
 splitPath: (function(filename) {
  var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 }),
 normalizeArray: (function(parts, allowAboveRoot) {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (; up--; up) {
    parts.unshift("..");
   }
  }
  return parts;
 }),
 normalize: (function(path) {
  var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter((function(p) {
   return !!p;
  })), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 }),
 dirname: (function(path) {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 }),
 basename: (function(path) {
  if (path === "/") return "/";
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 }),
 extname: (function(path) {
  return PATH.splitPath(path)[3];
 }),
 join: (function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return PATH.normalize(paths.join("/"));
 }),
 join2: (function(l, r) {
  return PATH.normalize(l + "/" + r);
 }),
 resolve: (function() {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = i >= 0 ? arguments[i] : FS.cwd();
   if (typeof path !== "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = path.charAt(0) === "/";
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
   return !!p;
  })), !resolvedAbsolute).join("/");
  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
 }),
 relative: (function(from, to) {
  from = PATH.resolve(from).substr(1);
  to = PATH.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (; start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (; end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 })
};
var TTY = {
 ttys: [],
 init: (function() {}),
 shutdown: (function() {}),
 register: (function(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 }),
 stream_ops: {
  open: (function(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   stream.tty = tty;
   stream.seekable = false;
  }),
  close: (function(stream) {
   stream.tty.ops.flush(stream.tty);
  }),
  flush: (function(stream) {
   stream.tty.ops.flush(stream.tty);
  }),
  read: (function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  }),
  write: (function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   for (var i = 0; i < length; i++) {
    try {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  })
 },
 default_tty_ops: {
  get_char: (function(tty) {
   if (!tty.input.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
     var BUFSIZE = 256;
     var buf = new Buffer(BUFSIZE);
     var bytesRead = 0;
     var fd = process.stdin.fd;
     var usingDevice = false;
     try {
      fd = fs.openSync("/dev/stdin", "r");
      usingDevice = true;
     } catch (e) {}
     bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
     if (usingDevice) {
      fs.closeSync(fd);
     }
     if (bytesRead > 0) {
      result = buf.slice(0, bytesRead).toString("utf-8");
     } else {
      result = null;
     }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
     result = window.prompt("Input: ");
     if (result !== null) {
      result += "\n";
     }
    } else if (typeof readline == "function") {
     result = readline();
     if (result !== null) {
      result += "\n";
     }
    }
    if (!result) {
     return null;
    }
    tty.input = intArrayFromString(result, true);
   }
   return tty.input.shift();
  }),
  put_char: (function(tty, val) {
   if (val === null || val === 10) {
    Module["print"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  }),
  flush: (function(tty) {
   if (tty.output && tty.output.length > 0) {
    Module["print"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  })
 },
 default_tty1_ops: {
  put_char: (function(tty, val) {
   if (val === null || val === 10) {
    Module["printErr"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  }),
  flush: (function(tty) {
   if (tty.output && tty.output.length > 0) {
    Module["printErr"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  })
 }
};
var MEMFS = {
 ops_table: null,
 mount: (function(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, 0);
 }),
 createNode: (function(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (!MEMFS.ops_table) {
   MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   };
  }
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 }),
 getFileDataAsRegularArray: (function(node) {
  if (node.contents && node.contents.subarray) {
   var arr = [];
   for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
   return arr;
  }
  return node.contents;
 }),
 getFileDataAsTypedArray: (function(node) {
  if (!node.contents) return new Uint8Array;
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 }),
 expandFileStorage: (function(node, newCapacity) {
  if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
   node.contents = MEMFS.getFileDataAsRegularArray(node);
   node.usedBytes = node.contents.length;
  }
  if (!node.contents || node.contents.subarray) {
   var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
   if (prevCapacity >= newCapacity) return;
   var CAPACITY_DOUBLING_MAX = 1024 * 1024;
   newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
   if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
   var oldContents = node.contents;
   node.contents = new Uint8Array(newCapacity);
   if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
   return;
  }
  if (!node.contents && newCapacity > 0) node.contents = [];
  while (node.contents.length < newCapacity) node.contents.push(0);
 }),
 resizeFileStorage: (function(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
   return;
  }
  if (!node.contents || node.contents.subarray) {
   var oldContents = node.contents;
   node.contents = new Uint8Array(new ArrayBuffer(newSize));
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
   return;
  }
  if (!node.contents) node.contents = [];
  if (node.contents.length > newSize) node.contents.length = newSize; else while (node.contents.length < newSize) node.contents.push(0);
  node.usedBytes = newSize;
 }),
 node_ops: {
  getattr: (function(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  }),
  setattr: (function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  }),
  lookup: (function(parent, name) {
   throw FS.genericErrors[ERRNO_CODES.ENOENT];
  }),
  mknod: (function(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  }),
  rename: (function(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   old_node.parent = new_dir;
  }),
  unlink: (function(parent, name) {
   delete parent.contents[name];
  }),
  rmdir: (function(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
   }
   delete parent.contents[name];
  }),
  readdir: (function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  }),
  symlink: (function(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
   node.link = oldpath;
   return node;
  }),
  readlink: (function(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return node.link;
  })
 },
 stream_ops: {
  read: (function(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   assert(size >= 0);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  }),
  write: (function(stream, buffer, offset, length, position, canOwn) {
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else for (var i = 0; i < length; i++) {
    node.contents[position + i] = buffer[offset + i];
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  }),
  llseek: (function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }),
  allocate: (function(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  }),
  mmap: (function(stream, buffer, offset, length, position, prot, flags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < stream.node.usedBytes) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = _malloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
    }
    buffer.set(contents, ptr);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  })
 }
};
var IDBFS = {
 dbs: {},
 indexedDB: (function() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  var ret = null;
  if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, "IDBFS used, but indexedDB not supported");
  return ret;
 }),
 DB_VERSION: 21,
 DB_STORE_NAME: "FILE_DATA",
 mount: (function(mount) {
  return MEMFS.mount.apply(null, arguments);
 }),
 syncfs: (function(mount, populate, callback) {
  IDBFS.getLocalSet(mount, (function(err, local) {
   if (err) return callback(err);
   IDBFS.getRemoteSet(mount, (function(err, remote) {
    if (err) return callback(err);
    var src = populate ? remote : local;
    var dst = populate ? local : remote;
    IDBFS.reconcile(src, dst, callback);
   }));
  }));
 }),
 getDB: (function(name, callback) {
  var db = IDBFS.dbs[name];
  if (db) {
   return callback(null, db);
  }
  var req;
  try {
   req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
  } catch (e) {
   return callback(e);
  }
  req.onupgradeneeded = (function(e) {
   var db = e.target.result;
   var transaction = e.target.transaction;
   var fileStore;
   if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
   } else {
    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
   }
   if (!fileStore.indexNames.contains("timestamp")) {
    fileStore.createIndex("timestamp", "timestamp", {
     unique: false
    });
   }
  });
  req.onsuccess = (function() {
   db = req.result;
   IDBFS.dbs[name] = db;
   callback(null, db);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 getLocalSet: (function(mount, callback) {
  var entries = {};
  function isRealDir(p) {
   return p !== "." && p !== "..";
  }
  function toAbsolute(root) {
   return (function(p) {
    return PATH.join2(root, p);
   });
  }
  var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  while (check.length) {
   var path = check.pop();
   var stat;
   try {
    stat = FS.stat(path);
   } catch (e) {
    return callback(e);
   }
   if (FS.isDir(stat.mode)) {
    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
   }
   entries[path] = {
    timestamp: stat.mtime
   };
  }
  return callback(null, {
   type: "local",
   entries: entries
  });
 }),
 getRemoteSet: (function(mount, callback) {
  var entries = {};
  IDBFS.getDB(mount.mountpoint, (function(err, db) {
   if (err) return callback(err);
   var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
   transaction.onerror = (function(e) {
    callback(this.error);
    e.preventDefault();
   });
   var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
   var index = store.index("timestamp");
   index.openKeyCursor().onsuccess = (function(event) {
    var cursor = event.target.result;
    if (!cursor) {
     return callback(null, {
      type: "remote",
      db: db,
      entries: entries
     });
    }
    entries[cursor.primaryKey] = {
     timestamp: cursor.key
    };
    cursor.continue();
   });
  }));
 }),
 loadLocalEntry: (function(path, callback) {
  var stat, node;
  try {
   var lookup = FS.lookupPath(path);
   node = lookup.node;
   stat = FS.stat(path);
  } catch (e) {
   return callback(e);
  }
  if (FS.isDir(stat.mode)) {
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode
   });
  } else if (FS.isFile(stat.mode)) {
   node.contents = MEMFS.getFileDataAsTypedArray(node);
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode,
    contents: node.contents
   });
  } else {
   return callback(new Error("node type not supported"));
  }
 }),
 storeLocalEntry: (function(path, entry, callback) {
  try {
   if (FS.isDir(entry.mode)) {
    FS.mkdir(path, entry.mode);
   } else if (FS.isFile(entry.mode)) {
    FS.writeFile(path, entry.contents, {
     encoding: "binary",
     canOwn: true
    });
   } else {
    return callback(new Error("node type not supported"));
   }
   FS.chmod(path, entry.mode);
   FS.utime(path, entry.timestamp, entry.timestamp);
  } catch (e) {
   return callback(e);
  }
  callback(null);
 }),
 removeLocalEntry: (function(path, callback) {
  try {
   var lookup = FS.lookupPath(path);
   var stat = FS.stat(path);
   if (FS.isDir(stat.mode)) {
    FS.rmdir(path);
   } else if (FS.isFile(stat.mode)) {
    FS.unlink(path);
   }
  } catch (e) {
   return callback(e);
  }
  callback(null);
 }),
 loadRemoteEntry: (function(store, path, callback) {
  var req = store.get(path);
  req.onsuccess = (function(event) {
   callback(null, event.target.result);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 storeRemoteEntry: (function(store, path, entry, callback) {
  var req = store.put(entry, path);
  req.onsuccess = (function() {
   callback(null);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 removeRemoteEntry: (function(store, path, callback) {
  var req = store.delete(path);
  req.onsuccess = (function() {
   callback(null);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 reconcile: (function(src, dst, callback) {
  var total = 0;
  var create = [];
  Object.keys(src.entries).forEach((function(key) {
   var e = src.entries[key];
   var e2 = dst.entries[key];
   if (!e2 || e.timestamp > e2.timestamp) {
    create.push(key);
    total++;
   }
  }));
  var remove = [];
  Object.keys(dst.entries).forEach((function(key) {
   var e = dst.entries[key];
   var e2 = src.entries[key];
   if (!e2) {
    remove.push(key);
    total++;
   }
  }));
  if (!total) {
   return callback(null);
  }
  var errored = false;
  var completed = 0;
  var db = src.type === "remote" ? src.db : dst.db;
  var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
  var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= total) {
    return callback(null);
   }
  }
  transaction.onerror = (function(e) {
   done(this.error);
   e.preventDefault();
  });
  create.sort().forEach((function(path) {
   if (dst.type === "local") {
    IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
     if (err) return done(err);
     IDBFS.storeLocalEntry(path, entry, done);
    }));
   } else {
    IDBFS.loadLocalEntry(path, (function(err, entry) {
     if (err) return done(err);
     IDBFS.storeRemoteEntry(store, path, entry, done);
    }));
   }
  }));
  remove.sort().reverse().forEach((function(path) {
   if (dst.type === "local") {
    IDBFS.removeLocalEntry(path, done);
   } else {
    IDBFS.removeRemoteEntry(store, path, done);
   }
  }));
 })
};
var NODEFS = {
 isWindows: false,
 staticInit: (function() {
  NODEFS.isWindows = !!process.platform.match(/^win/);
 }),
 mount: (function(mount) {
  assert(ENVIRONMENT_IS_NODE);
  return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
 }),
 createNode: (function(parent, name, mode, dev) {
  if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = FS.createNode(parent, name, mode);
  node.node_ops = NODEFS.node_ops;
  node.stream_ops = NODEFS.stream_ops;
  return node;
 }),
 getMode: (function(path) {
  var stat;
  try {
   stat = fs.lstatSync(path);
   if (NODEFS.isWindows) {
    stat.mode = stat.mode | (stat.mode & 146) >> 1;
   }
  } catch (e) {
   if (!e.code) throw e;
   throw new FS.ErrnoError(ERRNO_CODES[e.code]);
  }
  return stat.mode;
 }),
 realPath: (function(node) {
  var parts = [];
  while (node.parent !== node) {
   parts.push(node.name);
   node = node.parent;
  }
  parts.push(node.mount.opts.root);
  parts.reverse();
  return PATH.join.apply(null, parts);
 }),
 flagsToPermissionStringMap: {
  0: "r",
  1: "r+",
  2: "r+",
  64: "r",
  65: "r+",
  66: "r+",
  129: "rx+",
  193: "rx+",
  514: "w+",
  577: "w",
  578: "w+",
  705: "wx",
  706: "wx+",
  1024: "a",
  1025: "a",
  1026: "a+",
  1089: "a",
  1090: "a+",
  1153: "ax",
  1154: "ax+",
  1217: "ax",
  1218: "ax+",
  4096: "rs",
  4098: "rs+"
 },
 flagsToPermissionString: (function(flags) {
  if (flags in NODEFS.flagsToPermissionStringMap) {
   return NODEFS.flagsToPermissionStringMap[flags];
  } else {
   return flags;
  }
 }),
 node_ops: {
  getattr: (function(node) {
   var path = NODEFS.realPath(node);
   var stat;
   try {
    stat = fs.lstatSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (NODEFS.isWindows && !stat.blksize) {
    stat.blksize = 4096;
   }
   if (NODEFS.isWindows && !stat.blocks) {
    stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
   }
   return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    atime: stat.atime,
    mtime: stat.mtime,
    ctime: stat.ctime,
    blksize: stat.blksize,
    blocks: stat.blocks
   };
  }),
  setattr: (function(node, attr) {
   var path = NODEFS.realPath(node);
   try {
    if (attr.mode !== undefined) {
     fs.chmodSync(path, attr.mode);
     node.mode = attr.mode;
    }
    if (attr.timestamp !== undefined) {
     var date = new Date(attr.timestamp);
     fs.utimesSync(path, date, date);
    }
    if (attr.size !== undefined) {
     fs.truncateSync(path, attr.size);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  lookup: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   var mode = NODEFS.getMode(path);
   return NODEFS.createNode(parent, name, mode);
  }),
  mknod: (function(parent, name, mode, dev) {
   var node = NODEFS.createNode(parent, name, mode, dev);
   var path = NODEFS.realPath(node);
   try {
    if (FS.isDir(node.mode)) {
     fs.mkdirSync(path, node.mode);
    } else {
     fs.writeFileSync(path, "", {
      mode: node.mode
     });
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return node;
  }),
  rename: (function(oldNode, newDir, newName) {
   var oldPath = NODEFS.realPath(oldNode);
   var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
   try {
    fs.renameSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  unlink: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.unlinkSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  rmdir: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.rmdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  readdir: (function(node) {
   var path = NODEFS.realPath(node);
   try {
    return fs.readdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  symlink: (function(parent, newName, oldPath) {
   var newPath = PATH.join2(NODEFS.realPath(parent), newName);
   try {
    fs.symlinkSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  readlink: (function(node) {
   var path = NODEFS.realPath(node);
   try {
    path = fs.readlinkSync(path);
    path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
    return path;
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  })
 },
 stream_ops: {
  open: (function(stream) {
   var path = NODEFS.realPath(stream.node);
   try {
    if (FS.isFile(stream.node.mode)) {
     stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  close: (function(stream) {
   try {
    if (FS.isFile(stream.node.mode) && stream.nfd) {
     fs.closeSync(stream.nfd);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  read: (function(stream, buffer, offset, length, position) {
   if (length === 0) return 0;
   var nbuffer = new Buffer(length);
   var res;
   try {
    res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (res > 0) {
    for (var i = 0; i < res; i++) {
     buffer[offset + i] = nbuffer[i];
    }
   }
   return res;
  }),
  write: (function(stream, buffer, offset, length, position) {
   var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
   var res;
   try {
    res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return res;
  }),
  llseek: (function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     try {
      var stat = fs.fstatSync(stream.nfd);
      position += stat.size;
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES[e.code]);
     }
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  })
 }
};
var _stdin = allocate(1, "i32*", ALLOC_STATIC);
var _stdout = allocate(1, "i32*", ALLOC_STATIC);
var _stderr = allocate(1, "i32*", ALLOC_STATIC);
function _fflush(stream) {}
var FS = {
 root: null,
 mounts: [],
 devices: [ null ],
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 trackingDelegate: {},
 tracking: {
  openFlags: {
   READ: 1,
   WRITE: 2
  }
 },
 ErrnoError: null,
 genericErrors: {},
 handleFSError: (function(e) {
  if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
  return ___setErrNo(e.errno);
 }),
 lookupPath: (function(path, opts) {
  path = PATH.resolve(FS.cwd(), path);
  opts = opts || {};
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  for (var key in defaults) {
   if (opts[key] === undefined) {
    opts[key] = defaults[key];
   }
  }
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
  }
  var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
   return !!p;
  })), false);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = i === parts.length - 1;
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || islast && opts.follow_mount) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 }),
 getPath: (function(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
   }
   path = path ? node.name + "/" + path : node.name;
   node = node.parent;
  }
 }),
 hashName: (function(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
  }
  return (parentid + hash >>> 0) % FS.nameTable.length;
 }),
 hashAddNode: (function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 }),
 hashRemoveNode: (function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 }),
 lookupNode: (function(parent, name) {
  var err = FS.mayLookup(parent);
  if (err) {
   throw new FS.ErrnoError(err, parent);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 }),
 createNode: (function(parent, name, mode, rdev) {
  if (!FS.FSNode) {
   FS.FSNode = (function(parent, name, mode, rdev) {
    if (!parent) {
     parent = this;
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
   });
   FS.FSNode.prototype = {};
   var readMode = 292 | 73;
   var writeMode = 146;
   Object.defineProperties(FS.FSNode.prototype, {
    read: {
     get: (function() {
      return (this.mode & readMode) === readMode;
     }),
     set: (function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
     })
    },
    write: {
     get: (function() {
      return (this.mode & writeMode) === writeMode;
     }),
     set: (function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
     })
    },
    isFolder: {
     get: (function() {
      return FS.isDir(this.mode);
     })
    },
    isDevice: {
     get: (function() {
      return FS.isChrdev(this.mode);
     })
    }
   });
  }
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 }),
 destroyNode: (function(node) {
  FS.hashRemoveNode(node);
 }),
 isRoot: (function(node) {
  return node === node.parent;
 }),
 isMountpoint: (function(node) {
  return !!node.mounted;
 }),
 isFile: (function(mode) {
  return (mode & 61440) === 32768;
 }),
 isDir: (function(mode) {
  return (mode & 61440) === 16384;
 }),
 isLink: (function(mode) {
  return (mode & 61440) === 40960;
 }),
 isChrdev: (function(mode) {
  return (mode & 61440) === 8192;
 }),
 isBlkdev: (function(mode) {
  return (mode & 61440) === 24576;
 }),
 isFIFO: (function(mode) {
  return (mode & 61440) === 4096;
 }),
 isSocket: (function(mode) {
  return (mode & 49152) === 49152;
 }),
 flagModes: {
  "r": 0,
  "rs": 1052672,
  "r+": 2,
  "w": 577,
  "wx": 705,
  "xw": 705,
  "w+": 578,
  "wx+": 706,
  "xw+": 706,
  "a": 1089,
  "ax": 1217,
  "xa": 1217,
  "a+": 1090,
  "ax+": 1218,
  "xa+": 1218
 },
 modeStringToFlags: (function(str) {
  var flags = FS.flagModes[str];
  if (typeof flags === "undefined") {
   throw new Error("Unknown file open mode: " + str);
  }
  return flags;
 }),
 flagsToPermissionString: (function(flag) {
  var accmode = flag & 2097155;
  var perms = [ "r", "w", "rw" ][accmode];
  if (flag & 512) {
   perms += "w";
  }
  return perms;
 }),
 nodePermissions: (function(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
   return ERRNO_CODES.EACCES;
  } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
   return ERRNO_CODES.EACCES;
  } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
   return ERRNO_CODES.EACCES;
  }
  return 0;
 }),
 mayLookup: (function(dir) {
  var err = FS.nodePermissions(dir, "x");
  if (err) return err;
  if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
  return 0;
 }),
 mayCreate: (function(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return ERRNO_CODES.EEXIST;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 }),
 mayDelete: (function(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var err = FS.nodePermissions(dir, "wx");
  if (err) {
   return err;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return ERRNO_CODES.ENOTDIR;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return ERRNO_CODES.EBUSY;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return ERRNO_CODES.EISDIR;
   }
  }
  return 0;
 }),
 mayOpen: (function(node, flags) {
  if (!node) {
   return ERRNO_CODES.ENOENT;
  }
  if (FS.isLink(node.mode)) {
   return ERRNO_CODES.ELOOP;
  } else if (FS.isDir(node.mode)) {
   if ((flags & 2097155) !== 0 || flags & 512) {
    return ERRNO_CODES.EISDIR;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 }),
 MAX_OPEN_FDS: 4096,
 nextfd: (function(fd_start, fd_end) {
  fd_start = fd_start || 0;
  fd_end = fd_end || FS.MAX_OPEN_FDS;
  for (var fd = fd_start; fd <= fd_end; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
 }),
 getStream: (function(fd) {
  return FS.streams[fd];
 }),
 createStream: (function(stream, fd_start, fd_end) {
  if (!FS.FSStream) {
   FS.FSStream = (function() {});
   FS.FSStream.prototype = {};
   Object.defineProperties(FS.FSStream.prototype, {
    object: {
     get: (function() {
      return this.node;
     }),
     set: (function(val) {
      this.node = val;
     })
    },
    isRead: {
     get: (function() {
      return (this.flags & 2097155) !== 1;
     })
    },
    isWrite: {
     get: (function() {
      return (this.flags & 2097155) !== 0;
     })
    },
    isAppend: {
     get: (function() {
      return this.flags & 1024;
     })
    }
   });
  }
  var newStream = new FS.FSStream;
  for (var p in stream) {
   newStream[p] = stream[p];
  }
  stream = newStream;
  var fd = FS.nextfd(fd_start, fd_end);
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 }),
 closeStream: (function(fd) {
  FS.streams[fd] = null;
 }),
 getStreamFromPtr: (function(ptr) {
  return FS.streams[ptr - 1];
 }),
 getPtrForStream: (function(stream) {
  return stream ? stream.fd + 1 : 0;
 }),
 chrdev_stream_ops: {
  open: (function(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   if (stream.stream_ops.open) {
    stream.stream_ops.open(stream);
   }
  }),
  llseek: (function() {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  })
 },
 major: (function(dev) {
  return dev >> 8;
 }),
 minor: (function(dev) {
  return dev & 255;
 }),
 makedev: (function(ma, mi) {
  return ma << 8 | mi;
 }),
 registerDevice: (function(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 }),
 getDevice: (function(dev) {
  return FS.devices[dev];
 }),
 getMounts: (function(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push.apply(check, m.mounts);
  }
  return mounts;
 }),
 syncfs: (function(populate, callback) {
  if (typeof populate === "function") {
   callback = populate;
   populate = false;
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= mounts.length) {
    callback(null);
   }
  }
  mounts.forEach((function(mount) {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  }));
 }),
 mount: (function(type, opts, mountpoint) {
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 }),
 unmount: (function(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach((function(hash) {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.indexOf(current.mount) !== -1) {
     FS.destroyNode(current);
    }
    current = next;
   }
  }));
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  assert(idx !== -1);
  node.mount.mounts.splice(idx, 1);
 }),
 lookup: (function(parent, name) {
  return parent.node_ops.lookup(parent, name);
 }),
 mknod: (function(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var err = FS.mayCreate(parent, name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 }),
 create: (function(path, mode) {
  mode = mode !== undefined ? mode : 438;
  mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 }),
 mkdir: (function(path, mode) {
  mode = mode !== undefined ? mode : 511;
  mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 }),
 mkdev: (function(path, mode, dev) {
  if (typeof dev === "undefined") {
   dev = mode;
   mode = 438;
  }
  mode |= 8192;
  return FS.mknod(path, mode, dev);
 }),
 symlink: (function(oldpath, newpath) {
  if (!PATH.resolve(oldpath)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  var newname = PATH.basename(newpath);
  var err = FS.mayCreate(parent, newname);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 }),
 rename: (function(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  try {
   lookup = FS.lookupPath(old_path, {
    parent: true
   });
   old_dir = lookup.node;
   lookup = FS.lookupPath(new_path, {
    parent: true
   });
   new_dir = lookup.node;
  } catch (e) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  relative = PATH.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var err = FS.mayDelete(old_dir, old_name, isdir);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  if (new_dir !== old_dir) {
   err = FS.nodePermissions(old_dir, "w");
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  try {
   if (FS.trackingDelegate["willMovePath"]) {
    FS.trackingDelegate["willMovePath"](old_path, new_path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
  try {
   if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
  } catch (e) {
   console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
 }),
 rmdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, true);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 }),
 readdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
  }
  return node.node_ops.readdir(node);
 }),
 unlink: (function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, false);
  if (err) {
   if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 }),
 readlink: (function(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link));
 }),
 stat: (function(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return node.node_ops.getattr(node);
 }),
 lstat: (function(path) {
  return FS.stat(path, true);
 }),
 chmod: (function(path, mode, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  node.node_ops.setattr(node, {
   mode: mode & 4095 | node.mode & ~4095,
   timestamp: Date.now()
  });
 }),
 lchmod: (function(path, mode) {
  FS.chmod(path, mode, true);
 }),
 fchmod: (function(fd, mode) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  FS.chmod(stream.node, mode);
 }),
 chown: (function(path, uid, gid, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 }),
 lchown: (function(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 }),
 fchown: (function(fd, uid, gid) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  FS.chown(stream.node, uid, gid);
 }),
 truncate: (function(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var err = FS.nodePermissions(node, "w");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 }),
 ftruncate: (function(fd, len) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  FS.truncate(stream.node, len);
 }),
 utime: (function(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 }),
 open: (function(path, flags, mode, fd_start, fd_end) {
  if (path === "") {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
  mode = typeof mode === "undefined" ? 438 : mode;
  if (flags & 64) {
   mode = mode & 4095 | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path === "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if (flags & 64) {
   if (node) {
    if (flags & 128) {
     throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if (!created) {
   var err = FS.mayOpen(node, flags);
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  if (flags & 512) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  }, fd_start, fd_end);
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
    Module["printErr"]("read file: " + path);
   }
  }
  try {
   if (FS.trackingDelegate["onOpenFile"]) {
    var trackingFlags = 0;
    if ((flags & 2097155) !== 1) {
     trackingFlags |= FS.tracking.openFlags.READ;
    }
    if ((flags & 2097155) !== 0) {
     trackingFlags |= FS.tracking.openFlags.WRITE;
    }
    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
  }
  return stream;
 }),
 close: (function(stream) {
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
 }),
 llseek: (function(stream, offset, whence) {
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 }),
 read: (function(stream, buffer, offset, length, position) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var seeking = true;
  if (typeof position === "undefined") {
   position = stream.position;
   seeking = false;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 }),
 write: (function(stream, buffer, offset, length, position, canOwn) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if (stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = true;
  if (typeof position === "undefined") {
   position = stream.position;
   seeking = false;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  try {
   if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path);
  } catch (e) {
   console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message);
  }
  return bytesWritten;
 }),
 allocate: (function(stream, offset, length) {
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
  }
  stream.stream_ops.allocate(stream, offset, length);
 }),
 mmap: (function(stream, buffer, offset, length, position, prot, flags) {
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(ERRNO_CODES.EACCES);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
  }
  return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
 }),
 ioctl: (function(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 }),
 readFile: (function(path, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "r";
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = UTF8ArrayToString(buf, 0);
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 }),
 writeFile: (function(path, data, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "w";
  opts.encoding = opts.encoding || "utf8";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var stream = FS.open(path, opts.flags, opts.mode);
  if (opts.encoding === "utf8") {
   var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
   var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
   FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
  } else if (opts.encoding === "binary") {
   FS.write(stream, data, 0, data.length, 0, opts.canOwn);
  }
  FS.close(stream);
 }),
 cwd: (function() {
  return FS.currentPath;
 }),
 chdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
  }
  var err = FS.nodePermissions(lookup.node, "x");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  FS.currentPath = lookup.path;
 }),
 createDefaultDirectories: (function() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 }),
 createDefaultDevices: (function() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: (function() {
    return 0;
   }),
   write: (function() {
    return 0;
   })
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var random_device;
  if (typeof crypto !== "undefined") {
   var randomBuffer = new Uint8Array(1);
   random_device = (function() {
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0];
   });
  } else if (ENVIRONMENT_IS_NODE) {
   random_device = (function() {
    return require("crypto").randomBytes(1)[0];
   });
  } else {
   random_device = (function() {
    return Math.random() * 256 | 0;
   });
  }
  FS.createDevice("/dev", "random", random_device);
  FS.createDevice("/dev", "urandom", random_device);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 }),
 createStandardStreams: (function() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", "r");
  HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin);
  assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
  var stdout = FS.open("/dev/stdout", "w");
  HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout);
  assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
  var stderr = FS.open("/dev/stderr", "w");
  HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr);
  assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")");
 }),
 ensureErrnoError: (function() {
  if (FS.ErrnoError) return;
  FS.ErrnoError = function ErrnoError(errno, node) {
   this.node = node;
   this.setErrno = (function(errno) {
    this.errno = errno;
    for (var key in ERRNO_CODES) {
     if (ERRNO_CODES[key] === errno) {
      this.code = key;
      break;
     }
    }
   });
   this.setErrno(errno);
   this.message = ERRNO_MESSAGES[errno];
  };
  FS.ErrnoError.prototype = new Error;
  FS.ErrnoError.prototype.constructor = FS.ErrnoError;
  [ ERRNO_CODES.ENOENT ].forEach((function(code) {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  }));
 }),
 staticInit: (function() {
  FS.ensureErrnoError();
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
 }),
 init: (function(input, output, error) {
  assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
  FS.init.initialized = true;
  FS.ensureErrnoError();
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 }),
 quit: (function() {
  FS.init.initialized = false;
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 }),
 getMode: (function(canRead, canWrite) {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
 }),
 joinPath: (function(parts, forceRelative) {
  var path = PATH.join.apply(null, parts);
  if (forceRelative && path[0] == "/") path = path.substr(1);
  return path;
 }),
 absolutePath: (function(relative, base) {
  return PATH.resolve(base, relative);
 }),
 standardizePath: (function(path) {
  return PATH.normalize(path);
 }),
 findObject: (function(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (ret.exists) {
   return ret.object;
  } else {
   ___setErrNo(ret.error);
   return null;
  }
 }),
 analyzePath: (function(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 }),
 createFolder: (function(parent, name, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.mkdir(path, mode);
 }),
 createPath: (function(parent, path, canRead, canWrite) {
  parent = typeof parent === "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 }),
 createFile: (function(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.create(path, mode);
 }),
 createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
  var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
  var mode = FS.getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data === "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, "w");
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
  return node;
 }),
 createDevice: (function(parent, name, input, output) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open: (function(stream) {
    stream.seekable = false;
   }),
   close: (function(stream) {
    if (output && output.buffer && output.buffer.length) {
     output(10);
    }
   }),
   read: (function(stream, buffer, offset, length, pos) {
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   }),
   write: (function(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   })
  });
  return FS.mkdev(path, mode, dev);
 }),
 createLink: (function(parent, name, target, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  return FS.symlink(target, path);
 }),
 forceLoadFile: (function(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  var success = true;
  if (typeof XMLHttpRequest !== "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (Module["read"]) {
   try {
    obj.contents = intArrayFromString(Module["read"](obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    success = false;
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
  if (!success) ___setErrNo(ERRNO_CODES.EIO);
  return success;
 }),
 createLazyFile: (function(parent, name, url, canRead, canWrite) {
  function LazyUint8Array() {
   this.lengthKnown = false;
   this.chunks = [];
  }
  LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
   if (idx > this.length - 1 || idx < 0) {
    return undefined;
   }
   var chunkOffset = idx % this.chunkSize;
   var chunkNum = idx / this.chunkSize | 0;
   return this.getter(chunkNum)[chunkOffset];
  };
  LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
   this.getter = getter;
  };
  LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
   var xhr = new XMLHttpRequest;
   xhr.open("HEAD", url, false);
   xhr.send(null);
   if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
   var datalength = Number(xhr.getResponseHeader("Content-length"));
   var header;
   var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
   var chunkSize = 1024 * 1024;
   if (!hasByteServing) chunkSize = datalength;
   var doXHR = (function(from, to) {
    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
    if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
    if (xhr.overrideMimeType) {
     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    }
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    if (xhr.response !== undefined) {
     return new Uint8Array(xhr.response || []);
    } else {
     return intArrayFromString(xhr.responseText || "", true);
    }
   });
   var lazyArray = this;
   lazyArray.setDataGetter((function(chunkNum) {
    var start = chunkNum * chunkSize;
    var end = (chunkNum + 1) * chunkSize - 1;
    end = Math.min(end, datalength - 1);
    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
     lazyArray.chunks[chunkNum] = doXHR(start, end);
    }
    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
    return lazyArray.chunks[chunkNum];
   }));
   this._length = datalength;
   this._chunkSize = chunkSize;
   this.lengthKnown = true;
  };
  if (typeof XMLHttpRequest !== "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array;
   Object.defineProperty(lazyArray, "length", {
    get: (function() {
     if (!this.lengthKnown) {
      this.cacheLength();
     }
     return this._length;
    })
   });
   Object.defineProperty(lazyArray, "chunkSize", {
    get: (function() {
     if (!this.lengthKnown) {
      this.cacheLength();
     }
     return this._chunkSize;
    })
   });
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperty(node, "usedBytes", {
   get: (function() {
    return this.contents.length;
   })
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach((function(key) {
   var fn = node.stream_ops[key];
   stream_ops[key] = function forceLoadLazyFile() {
    if (!FS.forceLoadFile(node)) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    return fn.apply(null, arguments);
   };
  }));
  stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
   if (!FS.forceLoadFile(node)) {
    throw new FS.ErrnoError(ERRNO_CODES.EIO);
   }
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   assert(size >= 0);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  };
  node.stream_ops = stream_ops;
  return node;
 }),
 createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
  Browser.init();
  var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
  function processData(byteArray) {
   function finish(byteArray) {
    if (!dontCreateFile) {
     FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
    if (onload) onload();
    removeRunDependency("cp " + fullname);
   }
   var handled = false;
   Module["preloadPlugins"].forEach((function(plugin) {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
     plugin["handle"](byteArray, fullname, finish, (function() {
      if (onerror) onerror();
      removeRunDependency("cp " + fullname);
     }));
     handled = true;
    }
   }));
   if (!handled) finish(byteArray);
  }
  addRunDependency("cp " + fullname);
  if (typeof url == "string") {
   Browser.asyncLoad(url, (function(byteArray) {
    processData(byteArray);
   }), onerror);
  } else {
   processData(url);
  }
 }),
 indexedDB: (function() {
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
 }),
 DB_NAME: (function() {
  return "EM_FS_" + window.location.pathname;
 }),
 DB_VERSION: 20,
 DB_STORE_NAME: "FILE_DATA",
 saveFilesToDB: (function(paths, onload, onerror) {
  onload = onload || (function() {});
  onerror = onerror || (function() {});
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
   console.log("creating db");
   var db = openRequest.result;
   db.createObjectStore(FS.DB_STORE_NAME);
  };
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   var transaction = db.transaction([ FS.DB_STORE_NAME ], "readwrite");
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach((function(path) {
    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
    putRequest.onsuccess = function putRequest_onsuccess() {
     ok++;
     if (ok + fail == total) finish();
    };
    putRequest.onerror = function putRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   }));
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 }),
 loadFilesFromDB: (function(paths, onload, onerror) {
  onload = onload || (function() {});
  onerror = onerror || (function() {});
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = onerror;
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   try {
    var transaction = db.transaction([ FS.DB_STORE_NAME ], "readonly");
   } catch (e) {
    onerror(e);
    return;
   }
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach((function(path) {
    var getRequest = files.get(path);
    getRequest.onsuccess = function getRequest_onsuccess() {
     if (FS.analyzePath(path).exists) {
      FS.unlink(path);
     }
     FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
     ok++;
     if (ok + fail == total) finish();
    };
    getRequest.onerror = function getRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   }));
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 })
};
function _mkport() {
 throw "TODO";
}
var SOCKFS = {
 mount: (function(mount) {
  Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
  Module["websocket"]._callbacks = {};
  Module["websocket"]["on"] = (function(event, callback) {
   if ("function" === typeof callback) {
    this._callbacks[event] = callback;
   }
   return this;
  });
  Module["websocket"].emit = (function(event, param) {
   if ("function" === typeof this._callbacks[event]) {
    this._callbacks[event].call(this, param);
   }
  });
  return FS.createNode(null, "/", 16384 | 511, 0);
 }),
 createSocket: (function(family, type, protocol) {
  var streaming = type == 1;
  if (protocol) {
   assert(streaming == (protocol == 6));
  }
  var sock = {
   family: family,
   type: type,
   protocol: protocol,
   server: null,
   error: null,
   peers: {},
   pending: [],
   recv_queue: [],
   sock_ops: SOCKFS.websocket_sock_ops
  };
  var name = SOCKFS.nextname();
  var node = FS.createNode(SOCKFS.root, name, 49152, 0);
  node.sock = sock;
  var stream = FS.createStream({
   path: name,
   node: node,
   flags: FS.modeStringToFlags("r+"),
   seekable: false,
   stream_ops: SOCKFS.stream_ops
  });
  sock.stream = stream;
  return sock;
 }),
 getSocket: (function(fd) {
  var stream = FS.getStream(fd);
  if (!stream || !FS.isSocket(stream.node.mode)) {
   return null;
  }
  return stream.node.sock;
 }),
 stream_ops: {
  poll: (function(stream) {
   var sock = stream.node.sock;
   return sock.sock_ops.poll(sock);
  }),
  ioctl: (function(stream, request, varargs) {
   var sock = stream.node.sock;
   return sock.sock_ops.ioctl(sock, request, varargs);
  }),
  read: (function(stream, buffer, offset, length, position) {
   var sock = stream.node.sock;
   var msg = sock.sock_ops.recvmsg(sock, length);
   if (!msg) {
    return 0;
   }
   buffer.set(msg.buffer, offset);
   return msg.buffer.length;
  }),
  write: (function(stream, buffer, offset, length, position) {
   var sock = stream.node.sock;
   return sock.sock_ops.sendmsg(sock, buffer, offset, length);
  }),
  close: (function(stream) {
   var sock = stream.node.sock;
   sock.sock_ops.close(sock);
  })
 },
 nextname: (function() {
  if (!SOCKFS.nextname.current) {
   SOCKFS.nextname.current = 0;
  }
  return "socket[" + SOCKFS.nextname.current++ + "]";
 }),
 websocket_sock_ops: {
  createPeer: (function(sock, addr, port) {
   var ws;
   if (typeof addr === "object") {
    ws = addr;
    addr = null;
    port = null;
   }
   if (ws) {
    if (ws._socket) {
     addr = ws._socket.remoteAddress;
     port = ws._socket.remotePort;
    } else {
     var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
     if (!result) {
      throw new Error("WebSocket URL must be in the format ws(s)://address:port");
     }
     addr = result[1];
     port = parseInt(result[2], 10);
    }
   } else {
    try {
     var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
     var url = "ws:#".replace("#", "//");
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["url"]) {
       url = Module["websocket"]["url"];
      }
     }
     if (url === "ws://" || url === "wss://") {
      var parts = addr.split("/");
      url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
     }
     var subProtocols = "binary";
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["subprotocol"]) {
       subProtocols = Module["websocket"]["subprotocol"];
      }
     }
     subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
     var opts = ENVIRONMENT_IS_NODE ? {
      "protocol": subProtocols.toString()
     } : subProtocols;
     var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
     ws = new WebSocket(url, opts);
     ws.binaryType = "arraybuffer";
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
    }
   }
   var peer = {
    addr: addr,
    port: port,
    socket: ws,
    dgram_send_queue: []
   };
   SOCKFS.websocket_sock_ops.addPeer(sock, peer);
   SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
   if (sock.type === 2 && typeof sock.sport !== "undefined") {
    peer.dgram_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255 ]));
   }
   return peer;
  }),
  getPeer: (function(sock, addr, port) {
   return sock.peers[addr + ":" + port];
  }),
  addPeer: (function(sock, peer) {
   sock.peers[peer.addr + ":" + peer.port] = peer;
  }),
  removePeer: (function(sock, peer) {
   delete sock.peers[peer.addr + ":" + peer.port];
  }),
  handlePeerEvents: (function(sock, peer) {
   var first = true;
   var handleOpen = (function() {
    Module["websocket"].emit("open", sock.stream.fd);
    try {
     var queued = peer.dgram_send_queue.shift();
     while (queued) {
      peer.socket.send(queued);
      queued = peer.dgram_send_queue.shift();
     }
    } catch (e) {
     peer.socket.close();
    }
   });
   function handleMessage(data) {
    assert(typeof data !== "string" && data.byteLength !== undefined);
    data = new Uint8Array(data);
    var wasfirst = first;
    first = false;
    if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
     var newport = data[8] << 8 | data[9];
     SOCKFS.websocket_sock_ops.removePeer(sock, peer);
     peer.port = newport;
     SOCKFS.websocket_sock_ops.addPeer(sock, peer);
     return;
    }
    sock.recv_queue.push({
     addr: peer.addr,
     port: peer.port,
     data: data
    });
    Module["websocket"].emit("message", sock.stream.fd);
   }
   if (ENVIRONMENT_IS_NODE) {
    peer.socket.on("open", handleOpen);
    peer.socket.on("message", (function(data, flags) {
     if (!flags.binary) {
      return;
     }
     handleMessage((new Uint8Array(data)).buffer);
    }));
    peer.socket.on("close", (function() {
     Module["websocket"].emit("close", sock.stream.fd);
    }));
    peer.socket.on("error", (function(error) {
     sock.error = ERRNO_CODES.ECONNREFUSED;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    }));
   } else {
    peer.socket.onopen = handleOpen;
    peer.socket.onclose = (function() {
     Module["websocket"].emit("close", sock.stream.fd);
    });
    peer.socket.onmessage = function peer_socket_onmessage(event) {
     handleMessage(event.data);
    };
    peer.socket.onerror = (function(error) {
     sock.error = ERRNO_CODES.ECONNREFUSED;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    });
   }
  }),
  poll: (function(sock) {
   if (sock.type === 1 && sock.server) {
    return sock.pending.length ? 64 | 1 : 0;
   }
   var mask = 0;
   var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
   if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
    mask |= 64 | 1;
   }
   if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
    mask |= 4;
   }
   if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
    mask |= 16;
   }
   return mask;
  }),
  ioctl: (function(sock, request, arg) {
   switch (request) {
   case 21531:
    var bytes = 0;
    if (sock.recv_queue.length) {
     bytes = sock.recv_queue[0].data.length;
    }
    HEAP32[arg >> 2] = bytes;
    return 0;
   default:
    return ERRNO_CODES.EINVAL;
   }
  }),
  close: (function(sock) {
   if (sock.server) {
    try {
     sock.server.close();
    } catch (e) {}
    sock.server = null;
   }
   var peers = Object.keys(sock.peers);
   for (var i = 0; i < peers.length; i++) {
    var peer = sock.peers[peers[i]];
    try {
     peer.socket.close();
    } catch (e) {}
    SOCKFS.websocket_sock_ops.removePeer(sock, peer);
   }
   return 0;
  }),
  bind: (function(sock, addr, port) {
   if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   sock.saddr = addr;
   sock.sport = port || _mkport();
   if (sock.type === 2) {
    if (sock.server) {
     sock.server.close();
     sock.server = null;
    }
    try {
     sock.sock_ops.listen(sock, 0);
    } catch (e) {
     if (!(e instanceof FS.ErrnoError)) throw e;
     if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
    }
   }
  }),
  connect: (function(sock, addr, port) {
   if (sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   }
   if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
    var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
    if (dest) {
     if (dest.socket.readyState === dest.socket.CONNECTING) {
      throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
     } else {
      throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
     }
    }
   }
   var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
   sock.daddr = peer.addr;
   sock.dport = peer.port;
   throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
  }),
  listen: (function(sock, backlog) {
   if (!ENVIRONMENT_IS_NODE) {
    throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   }
   if (sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   var WebSocketServer = require("ws").Server;
   var host = sock.saddr;
   sock.server = new WebSocketServer({
    host: host,
    port: sock.sport
   });
   Module["websocket"].emit("listen", sock.stream.fd);
   sock.server.on("connection", (function(ws) {
    if (sock.type === 1) {
     var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
     var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
     newsock.daddr = peer.addr;
     newsock.dport = peer.port;
     sock.pending.push(newsock);
     Module["websocket"].emit("connection", newsock.stream.fd);
    } else {
     SOCKFS.websocket_sock_ops.createPeer(sock, ws);
     Module["websocket"].emit("connection", sock.stream.fd);
    }
   }));
   sock.server.on("closed", (function() {
    Module["websocket"].emit("close", sock.stream.fd);
    sock.server = null;
   }));
   sock.server.on("error", (function(error) {
    sock.error = ERRNO_CODES.EHOSTUNREACH;
    Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable" ]);
   }));
  }),
  accept: (function(listensock) {
   if (!listensock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   var newsock = listensock.pending.shift();
   newsock.stream.flags = listensock.stream.flags;
   return newsock;
  }),
  getname: (function(sock, peer) {
   var addr, port;
   if (peer) {
    if (sock.daddr === undefined || sock.dport === undefined) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
    }
    addr = sock.daddr;
    port = sock.dport;
   } else {
    addr = sock.saddr || 0;
    port = sock.sport || 0;
   }
   return {
    addr: addr,
    port: port
   };
  }),
  sendmsg: (function(sock, buffer, offset, length, addr, port) {
   if (sock.type === 2) {
    if (addr === undefined || port === undefined) {
     addr = sock.daddr;
     port = sock.dport;
    }
    if (addr === undefined || port === undefined) {
     throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
    }
   } else {
    addr = sock.daddr;
    port = sock.dport;
   }
   var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
   if (sock.type === 1) {
    if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
    } else if (dest.socket.readyState === dest.socket.CONNECTING) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
   }
   var data;
   if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
    data = buffer.slice(offset, offset + length);
   } else {
    data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
   }
   if (sock.type === 2) {
    if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
     if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
     }
     dest.dgram_send_queue.push(data);
     return length;
    }
   }
   try {
    dest.socket.send(data);
    return length;
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
  }),
  recvmsg: (function(sock, length) {
   if (sock.type === 1 && sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
   }
   var queued = sock.recv_queue.shift();
   if (!queued) {
    if (sock.type === 1) {
     var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
     if (!dest) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
     } else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      return null;
     } else {
      throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     }
    } else {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
   }
   var queuedLength = queued.data.byteLength || queued.data.length;
   var queuedOffset = queued.data.byteOffset || 0;
   var queuedBuffer = queued.data.buffer || queued.data;
   var bytesRead = Math.min(length, queuedLength);
   var res = {
    buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
    addr: queued.addr,
    port: queued.port
   };
   if (sock.type === 1 && bytesRead < queuedLength) {
    var bytesRemaining = queuedLength - bytesRead;
    queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
    sock.recv_queue.unshift(queued);
   }
   return res;
  })
 }
};
function _send(fd, buf, len, flags) {
 var sock = SOCKFS.getSocket(fd);
 if (!sock) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 return _write(fd, buf, len);
}
function _pwrite(fildes, buf, nbyte, offset) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.write(stream, slab, buf, nbyte, offset);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _write(fildes, buf, nbyte) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.write(stream, slab, buf, nbyte);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _fileno(stream) {
 stream = FS.getStreamFromPtr(stream);
 if (!stream) return -1;
 return stream.fd;
}
function _fwrite(ptr, size, nitems, stream) {
 var bytesToWrite = nitems * size;
 if (bytesToWrite == 0) return 0;
 var fd = _fileno(stream);
 var bytesWritten = _write(fd, ptr, bytesToWrite);
 if (bytesWritten == -1) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (streamObj) streamObj.error = true;
  return 0;
 } else {
  return bytesWritten / size | 0;
 }
}
Module["_strlen"] = _strlen;
function __reallyNegative(x) {
 return x < 0 || x === 0 && 1 / x === -Infinity;
}
function __formatString(format, varargs) {
 var textIndex = format;
 var argIndex = 0;
 function getNextArg(type) {
  var ret;
  if (type === "double") {
   ret = (HEAP32[tempDoublePtr >> 2] = HEAP32[varargs + argIndex >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[varargs + (argIndex + 4) >> 2], +HEAPF64[tempDoublePtr >> 3]);
  } else if (type == "i64") {
   ret = [ HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2] ];
  } else {
   type = "i32";
   ret = HEAP32[varargs + argIndex >> 2];
  }
  argIndex += Runtime.getNativeFieldSize(type);
  return ret;
 }
 var ret = [];
 var curr, next, currArg;
 while (1) {
  var startTextIndex = textIndex;
  curr = HEAP8[textIndex >> 0];
  if (curr === 0) break;
  next = HEAP8[textIndex + 1 >> 0];
  if (curr == 37) {
   var flagAlwaysSigned = false;
   var flagLeftAlign = false;
   var flagAlternative = false;
   var flagZeroPad = false;
   var flagPadSign = false;
   flagsLoop : while (1) {
    switch (next) {
    case 43:
     flagAlwaysSigned = true;
     break;
    case 45:
     flagLeftAlign = true;
     break;
    case 35:
     flagAlternative = true;
     break;
    case 48:
     if (flagZeroPad) {
      break flagsLoop;
     } else {
      flagZeroPad = true;
      break;
     }
    case 32:
     flagPadSign = true;
     break;
    default:
     break flagsLoop;
    }
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
   }
   var width = 0;
   if (next == 42) {
    width = getNextArg("i32");
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
   } else {
    while (next >= 48 && next <= 57) {
     width = width * 10 + (next - 48);
     textIndex++;
     next = HEAP8[textIndex + 1 >> 0];
    }
   }
   var precisionSet = false, precision = -1;
   if (next == 46) {
    precision = 0;
    precisionSet = true;
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
    if (next == 42) {
     precision = getNextArg("i32");
     textIndex++;
    } else {
     while (1) {
      var precisionChr = HEAP8[textIndex + 1 >> 0];
      if (precisionChr < 48 || precisionChr > 57) break;
      precision = precision * 10 + (precisionChr - 48);
      textIndex++;
     }
    }
    next = HEAP8[textIndex + 1 >> 0];
   }
   if (precision < 0) {
    precision = 6;
    precisionSet = false;
   }
   var argSize;
   switch (String.fromCharCode(next)) {
   case "h":
    var nextNext = HEAP8[textIndex + 2 >> 0];
    if (nextNext == 104) {
     textIndex++;
     argSize = 1;
    } else {
     argSize = 2;
    }
    break;
   case "l":
    var nextNext = HEAP8[textIndex + 2 >> 0];
    if (nextNext == 108) {
     textIndex++;
     argSize = 8;
    } else {
     argSize = 4;
    }
    break;
   case "L":
   case "q":
   case "j":
    argSize = 8;
    break;
   case "z":
   case "t":
   case "I":
    argSize = 4;
    break;
   default:
    argSize = null;
   }
   if (argSize) textIndex++;
   next = HEAP8[textIndex + 1 >> 0];
   switch (String.fromCharCode(next)) {
   case "d":
   case "i":
   case "u":
   case "o":
   case "x":
   case "X":
   case "p":
    {
     var signed = next == 100 || next == 105;
     argSize = argSize || 4;
     var currArg = getNextArg("i" + argSize * 8);
     var origArg = currArg;
     var argText;
     if (argSize == 8) {
      currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
     }
     if (argSize <= 4) {
      var limit = Math.pow(256, argSize) - 1;
      currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
     }
     var currAbsArg = Math.abs(currArg);
     var prefix = "";
     if (next == 100 || next == 105) {
      if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else argText = reSign(currArg, 8 * argSize, 1).toString(10);
     } else if (next == 117) {
      if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else argText = unSign(currArg, 8 * argSize, 1).toString(10);
      currArg = Math.abs(currArg);
     } else if (next == 111) {
      argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8);
     } else if (next == 120 || next == 88) {
      prefix = flagAlternative && currArg != 0 ? "0x" : "";
      if (argSize == 8 && i64Math) {
       if (origArg[1]) {
        argText = (origArg[1] >>> 0).toString(16);
        var lower = (origArg[0] >>> 0).toString(16);
        while (lower.length < 8) lower = "0" + lower;
        argText += lower;
       } else {
        argText = (origArg[0] >>> 0).toString(16);
       }
      } else if (currArg < 0) {
       currArg = -currArg;
       argText = (currAbsArg - 1).toString(16);
       var buffer = [];
       for (var i = 0; i < argText.length; i++) {
        buffer.push((15 - parseInt(argText[i], 16)).toString(16));
       }
       argText = buffer.join("");
       while (argText.length < argSize * 2) argText = "f" + argText;
      } else {
       argText = currAbsArg.toString(16);
      }
      if (next == 88) {
       prefix = prefix.toUpperCase();
       argText = argText.toUpperCase();
      }
     } else if (next == 112) {
      if (currAbsArg === 0) {
       argText = "(nil)";
      } else {
       prefix = "0x";
       argText = currAbsArg.toString(16);
      }
     }
     if (precisionSet) {
      while (argText.length < precision) {
       argText = "0" + argText;
      }
     }
     if (currArg >= 0) {
      if (flagAlwaysSigned) {
       prefix = "+" + prefix;
      } else if (flagPadSign) {
       prefix = " " + prefix;
      }
     }
     if (argText.charAt(0) == "-") {
      prefix = "-" + prefix;
      argText = argText.substr(1);
     }
     while (prefix.length + argText.length < width) {
      if (flagLeftAlign) {
       argText += " ";
      } else {
       if (flagZeroPad) {
        argText = "0" + argText;
       } else {
        prefix = " " + prefix;
       }
      }
     }
     argText = prefix + argText;
     argText.split("").forEach((function(chr) {
      ret.push(chr.charCodeAt(0));
     }));
     break;
    }
   case "f":
   case "F":
   case "e":
   case "E":
   case "g":
   case "G":
    {
     var currArg = getNextArg("double");
     var argText;
     if (isNaN(currArg)) {
      argText = "nan";
      flagZeroPad = false;
     } else if (!isFinite(currArg)) {
      argText = (currArg < 0 ? "-" : "") + "inf";
      flagZeroPad = false;
     } else {
      var isGeneral = false;
      var effectivePrecision = Math.min(precision, 20);
      if (next == 103 || next == 71) {
       isGeneral = true;
       precision = precision || 1;
       var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
       if (precision > exponent && exponent >= -4) {
        next = (next == 103 ? "f" : "F").charCodeAt(0);
        precision -= exponent + 1;
       } else {
        next = (next == 103 ? "e" : "E").charCodeAt(0);
        precision--;
       }
       effectivePrecision = Math.min(precision, 20);
      }
      if (next == 101 || next == 69) {
       argText = currArg.toExponential(effectivePrecision);
       if (/[eE][-+]\d$/.test(argText)) {
        argText = argText.slice(0, -1) + "0" + argText.slice(-1);
       }
      } else if (next == 102 || next == 70) {
       argText = currArg.toFixed(effectivePrecision);
       if (currArg === 0 && __reallyNegative(currArg)) {
        argText = "-" + argText;
       }
      }
      var parts = argText.split("e");
      if (isGeneral && !flagAlternative) {
       while (parts[0].length > 1 && parts[0].indexOf(".") != -1 && (parts[0].slice(-1) == "0" || parts[0].slice(-1) == ".")) {
        parts[0] = parts[0].slice(0, -1);
       }
      } else {
       if (flagAlternative && argText.indexOf(".") == -1) parts[0] += ".";
       while (precision > effectivePrecision++) parts[0] += "0";
      }
      argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : "");
      if (next == 69) argText = argText.toUpperCase();
      if (currArg >= 0) {
       if (flagAlwaysSigned) {
        argText = "+" + argText;
       } else if (flagPadSign) {
        argText = " " + argText;
       }
      }
     }
     while (argText.length < width) {
      if (flagLeftAlign) {
       argText += " ";
      } else {
       if (flagZeroPad && (argText[0] == "-" || argText[0] == "+")) {
        argText = argText[0] + "0" + argText.slice(1);
       } else {
        argText = (flagZeroPad ? "0" : " ") + argText;
       }
      }
     }
     if (next < 97) argText = argText.toUpperCase();
     argText.split("").forEach((function(chr) {
      ret.push(chr.charCodeAt(0));
     }));
     break;
    }
   case "s":
    {
     var arg = getNextArg("i8*");
     var argLength = arg ? _strlen(arg) : "(null)".length;
     if (precisionSet) argLength = Math.min(argLength, precision);
     if (!flagLeftAlign) {
      while (argLength < width--) {
       ret.push(32);
      }
     }
     if (arg) {
      for (var i = 0; i < argLength; i++) {
       ret.push(HEAPU8[arg++ >> 0]);
      }
     } else {
      ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), true));
     }
     if (flagLeftAlign) {
      while (argLength < width--) {
       ret.push(32);
      }
     }
     break;
    }
   case "c":
    {
     if (flagLeftAlign) ret.push(getNextArg("i8"));
     while (--width > 0) {
      ret.push(32);
     }
     if (!flagLeftAlign) ret.push(getNextArg("i8"));
     break;
    }
   case "n":
    {
     var ptr = getNextArg("i32*");
     HEAP32[ptr >> 2] = ret.length;
     break;
    }
   case "%":
    {
     ret.push(curr);
     break;
    }
   default:
    {
     for (var i = startTextIndex; i < textIndex + 2; i++) {
      ret.push(HEAP8[i >> 0]);
     }
    }
   }
   textIndex += 2;
  } else {
   ret.push(curr);
   textIndex += 1;
  }
 }
 return ret;
}
function _fprintf(stream, format, varargs) {
 var result = __formatString(format, varargs);
 var stack = Runtime.stackSave();
 var ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
 Runtime.stackRestore(stack);
 return ret;
}
function _printf(format, varargs) {
 var stdout = HEAP32[_stdout >> 2];
 return _fprintf(stdout, format, varargs);
}
var _sqrtf = Math_sqrt;
function _fputc(c, stream) {
 var chr = unSign(c & 255);
 HEAP8[_fputc.ret >> 0] = chr;
 var fd = _fileno(stream);
 var ret = _write(fd, _fputc.ret, 1);
 if (ret == -1) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (streamObj) streamObj.error = true;
  return -1;
 } else {
  return chr;
 }
}
function _sysconf(name) {
 switch (name) {
 case 30:
  return PAGE_SIZE;
 case 132:
 case 133:
 case 12:
 case 137:
 case 138:
 case 15:
 case 235:
 case 16:
 case 17:
 case 18:
 case 19:
 case 20:
 case 149:
 case 13:
 case 10:
 case 236:
 case 153:
 case 9:
 case 21:
 case 22:
 case 159:
 case 154:
 case 14:
 case 77:
 case 78:
 case 139:
 case 80:
 case 81:
 case 79:
 case 82:
 case 68:
 case 67:
 case 164:
 case 11:
 case 29:
 case 47:
 case 48:
 case 95:
 case 52:
 case 51:
 case 46:
  return 200809;
 case 27:
 case 246:
 case 127:
 case 128:
 case 23:
 case 24:
 case 160:
 case 161:
 case 181:
 case 182:
 case 242:
 case 183:
 case 184:
 case 243:
 case 244:
 case 245:
 case 165:
 case 178:
 case 179:
 case 49:
 case 50:
 case 168:
 case 169:
 case 175:
 case 170:
 case 171:
 case 172:
 case 97:
 case 76:
 case 32:
 case 173:
 case 35:
  return -1;
 case 176:
 case 177:
 case 7:
 case 155:
 case 8:
 case 157:
 case 125:
 case 126:
 case 92:
 case 93:
 case 129:
 case 130:
 case 131:
 case 94:
 case 91:
  return 1;
 case 74:
 case 60:
 case 69:
 case 70:
 case 4:
  return 1024;
 case 31:
 case 42:
 case 72:
  return 32;
 case 87:
 case 26:
 case 33:
  return 2147483647;
 case 34:
 case 1:
  return 47839;
 case 38:
 case 36:
  return 99;
 case 43:
 case 37:
  return 2048;
 case 0:
  return 2097152;
 case 3:
  return 65536;
 case 28:
  return 32768;
 case 44:
  return 32767;
 case 75:
  return 16384;
 case 39:
  return 1e3;
 case 89:
  return 700;
 case 71:
  return 256;
 case 40:
  return 255;
 case 2:
  return 100;
 case 180:
  return 64;
 case 25:
  return 20;
 case 5:
  return 16;
 case 6:
  return 6;
 case 73:
  return 4;
 case 84:
  {
   if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
   return 1;
  }
 }
 ___setErrNo(ERRNO_CODES.EINVAL);
 return -1;
}
function _fputs(s, stream) {
 var fd = _fileno(stream);
 return _write(fd, s, _strlen(s));
}
function _puts(s) {
 var stdout = HEAP32[_stdout >> 2];
 var ret = _fputs(s, stdout);
 if (ret < 0) {
  return ret;
 } else {
  var newlineRet = _fputc(10, stdout);
  return newlineRet < 0 ? -1 : ret + 1;
 }
}
function _emscripten_set_main_loop_timing(mode, value) {
 Browser.mainLoop.timingMode = mode;
 Browser.mainLoop.timingValue = value;
 if (!Browser.mainLoop.func) {
  return 1;
 }
 if (mode == 0) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
   setTimeout(Browser.mainLoop.runner, value);
  };
  Browser.mainLoop.method = "timeout";
 } else if (mode == 1) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
   Browser.requestAnimationFrame(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "rAF";
 }
 return 0;
}
function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
 Module["noExitRuntime"] = true;
 assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
 Browser.mainLoop.func = func;
 Browser.mainLoop.arg = arg;
 var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
 Browser.mainLoop.runner = function Browser_mainLoop_runner() {
  if (ABORT) return;
  if (Browser.mainLoop.queue.length > 0) {
   var start = Date.now();
   var blocker = Browser.mainLoop.queue.shift();
   blocker.func(blocker.arg);
   if (Browser.mainLoop.remainingBlockers) {
    var remaining = Browser.mainLoop.remainingBlockers;
    var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
    if (blocker.counted) {
     Browser.mainLoop.remainingBlockers = next;
    } else {
     next = next + .5;
     Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
    }
   }
   console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
   Browser.mainLoop.updateStatus();
   setTimeout(Browser.mainLoop.runner, 0);
   return;
  }
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
  if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
   Browser.mainLoop.scheduler();
   return;
  }
  if (Browser.mainLoop.method === "timeout" && Module.ctx) {
   Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
   Browser.mainLoop.method = "";
  }
  Browser.mainLoop.runIter((function() {
   if (typeof arg !== "undefined") {
    Runtime.dynCall("vi", func, [ arg ]);
   } else {
    Runtime.dynCall("v", func);
   }
  }));
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  Browser.mainLoop.scheduler();
 };
 if (!noSetTiming) {
  if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps); else _emscripten_set_main_loop_timing(1, 1);
  Browser.mainLoop.scheduler();
 }
 if (simulateInfiniteLoop) {
  throw "SimulateInfiniteLoop";
 }
}
var Browser = {
 mainLoop: {
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  pause: (function() {
   Browser.mainLoop.scheduler = null;
   Browser.mainLoop.currentlyRunningMainloop++;
  }),
  resume: (function() {
   Browser.mainLoop.currentlyRunningMainloop++;
   var timingMode = Browser.mainLoop.timingMode;
   var timingValue = Browser.mainLoop.timingValue;
   var func = Browser.mainLoop.func;
   Browser.mainLoop.func = null;
   _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
   _emscripten_set_main_loop_timing(timingMode, timingValue);
   Browser.mainLoop.scheduler();
  }),
  updateStatus: (function() {
   if (Module["setStatus"]) {
    var message = Module["statusMessage"] || "Please wait...";
    var remaining = Browser.mainLoop.remainingBlockers;
    var expected = Browser.mainLoop.expectedBlockers;
    if (remaining) {
     if (remaining < expected) {
      Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")");
     } else {
      Module["setStatus"](message);
     }
    } else {
     Module["setStatus"]("");
    }
   }
  }),
  runIter: (function(func) {
   if (ABORT) return;
   if (Module["preMainLoop"]) {
    var preRet = Module["preMainLoop"]();
    if (preRet === false) {
     return;
    }
   }
   try {
    func();
   } catch (e) {
    if (e instanceof ExitStatus) {
     return;
    } else {
     if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [ e, e.stack ]);
     throw e;
    }
   }
   if (Module["postMainLoop"]) Module["postMainLoop"]();
  })
 },
 isFullScreen: false,
 pointerLock: false,
 moduleContextCreatedCallbacks: [],
 workers: [],
 init: (function() {
  if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
  if (Browser.initted) return;
  Browser.initted = true;
  try {
   new Blob;
   Browser.hasBlobConstructor = true;
  } catch (e) {
   Browser.hasBlobConstructor = false;
   console.log("warning: no blob constructor, cannot create blobs with mimetypes");
  }
  Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
  Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
  if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
   console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
   Module.noImageDecoding = true;
  }
  var imagePlugin = {};
  imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
   return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
  };
  imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
   var b = null;
   if (Browser.hasBlobConstructor) {
    try {
     b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
     if (b.size !== byteArray.length) {
      b = new Blob([ (new Uint8Array(byteArray)).buffer ], {
       type: Browser.getMimetype(name)
      });
     }
    } catch (e) {
     Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder");
    }
   }
   if (!b) {
    var bb = new Browser.BlobBuilder;
    bb.append((new Uint8Array(byteArray)).buffer);
    b = bb.getBlob();
   }
   var url = Browser.URLObject.createObjectURL(b);
   var img = new Image;
   img.onload = function img_onload() {
    assert(img.complete, "Image " + name + " could not be decoded");
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    Module["preloadedImages"][name] = canvas;
    Browser.URLObject.revokeObjectURL(url);
    if (onload) onload(byteArray);
   };
   img.onerror = function img_onerror(event) {
    console.log("Image " + url + " could not be decoded");
    if (onerror) onerror();
   };
   img.src = url;
  };
  Module["preloadPlugins"].push(imagePlugin);
  var audioPlugin = {};
  audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
   return !Module.noAudioDecoding && name.substr(-4) in {
    ".ogg": 1,
    ".wav": 1,
    ".mp3": 1
   };
  };
  audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
   var done = false;
   function finish(audio) {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = audio;
    if (onload) onload(byteArray);
   }
   function fail() {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = new Audio;
    if (onerror) onerror();
   }
   if (Browser.hasBlobConstructor) {
    try {
     var b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
    } catch (e) {
     return fail();
    }
    var url = Browser.URLObject.createObjectURL(b);
    var audio = new Audio;
    audio.addEventListener("canplaythrough", (function() {
     finish(audio);
    }), false);
    audio.onerror = function audio_onerror(event) {
     if (done) return;
     console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");
     function encode64(data) {
      var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var PAD = "=";
      var ret = "";
      var leftchar = 0;
      var leftbits = 0;
      for (var i = 0; i < data.length; i++) {
       leftchar = leftchar << 8 | data[i];
       leftbits += 8;
       while (leftbits >= 6) {
        var curr = leftchar >> leftbits - 6 & 63;
        leftbits -= 6;
        ret += BASE[curr];
       }
      }
      if (leftbits == 2) {
       ret += BASE[(leftchar & 3) << 4];
       ret += PAD + PAD;
      } else if (leftbits == 4) {
       ret += BASE[(leftchar & 15) << 2];
       ret += PAD;
      }
      return ret;
     }
     audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
     finish(audio);
    };
    audio.src = url;
    Browser.safeSetTimeout((function() {
     finish(audio);
    }), 1e4);
   } else {
    return fail();
   }
  };
  Module["preloadPlugins"].push(audioPlugin);
  var canvas = Module["canvas"];
  function pointerLockChange() {
   Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas || document["msPointerLockElement"] === canvas;
  }
  if (canvas) {
   canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (function() {});
   canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (function() {});
   canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
   document.addEventListener("pointerlockchange", pointerLockChange, false);
   document.addEventListener("mozpointerlockchange", pointerLockChange, false);
   document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
   document.addEventListener("mspointerlockchange", pointerLockChange, false);
   if (Module["elementPointerLock"]) {
    canvas.addEventListener("click", (function(ev) {
     if (!Browser.pointerLock && canvas.requestPointerLock) {
      canvas.requestPointerLock();
      ev.preventDefault();
     }
    }), false);
   }
  }
 }),
 createContext: (function(canvas, useWebGL, setInModule, webGLContextAttributes) {
  if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
  var ctx;
  var contextHandle;
  if (useWebGL) {
   var contextAttributes = {
    antialias: false,
    alpha: false
   };
   if (webGLContextAttributes) {
    for (var attribute in webGLContextAttributes) {
     contextAttributes[attribute] = webGLContextAttributes[attribute];
    }
   }
   contextHandle = GL.createContext(canvas, contextAttributes);
   if (contextHandle) {
    ctx = GL.getContext(contextHandle).GLctx;
   }
   canvas.style.backgroundColor = "black";
  } else {
   ctx = canvas.getContext("2d");
  }
  if (!ctx) return null;
  if (setInModule) {
   if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
   Module.ctx = ctx;
   if (useWebGL) GL.makeContextCurrent(contextHandle);
   Module.useWebGL = useWebGL;
   Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
    callback();
   }));
   Browser.init();
  }
  return ctx;
 }),
 destroyContext: (function(canvas, useWebGL, setInModule) {}),
 fullScreenHandlersInstalled: false,
 lockPointer: undefined,
 resizeCanvas: undefined,
 requestFullScreen: (function(lockPointer, resizeCanvas, vrDevice) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  Browser.vrDevice = vrDevice;
  if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
  if (typeof Browser.vrDevice === "undefined") Browser.vrDevice = null;
  var canvas = Module["canvas"];
  function fullScreenChange() {
   Browser.isFullScreen = false;
   var canvasContainer = canvas.parentNode;
   if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
    canvas.cancelFullScreen = document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["webkitCancelFullScreen"] || document["msExitFullscreen"] || document["exitFullscreen"] || (function() {});
    canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
    if (Browser.lockPointer) canvas.requestPointerLock();
    Browser.isFullScreen = true;
    if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
   } else {
    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
    canvasContainer.parentNode.removeChild(canvasContainer);
    if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
   }
   if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullScreen);
   Browser.updateCanvasDimensions(canvas);
  }
  if (!Browser.fullScreenHandlersInstalled) {
   Browser.fullScreenHandlersInstalled = true;
   document.addEventListener("fullscreenchange", fullScreenChange, false);
   document.addEventListener("mozfullscreenchange", fullScreenChange, false);
   document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
   document.addEventListener("MSFullscreenChange", fullScreenChange, false);
  }
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);
  canvasContainer.requestFullScreen = canvasContainer["requestFullScreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullScreen"] ? (function() {
   canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
  }) : null);
  if (vrDevice) {
   canvasContainer.requestFullScreen({
    vrDisplay: vrDevice
   });
  } else {
   canvasContainer.requestFullScreen();
  }
 }),
 nextRAF: 0,
 fakeRequestAnimationFrame: (function(func) {
  var now = Date.now();
  if (Browser.nextRAF === 0) {
   Browser.nextRAF = now + 1e3 / 60;
  } else {
   while (now + 2 >= Browser.nextRAF) {
    Browser.nextRAF += 1e3 / 60;
   }
  }
  var delay = Math.max(Browser.nextRAF - now, 0);
  setTimeout(func, delay);
 }),
 requestAnimationFrame: function requestAnimationFrame(func) {
  if (typeof window === "undefined") {
   Browser.fakeRequestAnimationFrame(func);
  } else {
   if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || Browser.fakeRequestAnimationFrame;
   }
   window.requestAnimationFrame(func);
  }
 },
 safeCallback: (function(func) {
  return (function() {
   if (!ABORT) return func.apply(null, arguments);
  });
 }),
 allowAsyncCallbacks: true,
 queuedAsyncCallbacks: [],
 pauseAsyncCallbacks: (function() {
  Browser.allowAsyncCallbacks = false;
 }),
 resumeAsyncCallbacks: (function() {
  Browser.allowAsyncCallbacks = true;
  if (Browser.queuedAsyncCallbacks.length > 0) {
   var callbacks = Browser.queuedAsyncCallbacks;
   Browser.queuedAsyncCallbacks = [];
   callbacks.forEach((function(func) {
    func();
   }));
  }
 }),
 safeRequestAnimationFrame: (function(func) {
  return Browser.requestAnimationFrame((function() {
   if (ABORT) return;
   if (Browser.allowAsyncCallbacks) {
    func();
   } else {
    Browser.queuedAsyncCallbacks.push(func);
   }
  }));
 }),
 safeSetTimeout: (function(func, timeout) {
  Module["noExitRuntime"] = true;
  return setTimeout((function() {
   if (ABORT) return;
   if (Browser.allowAsyncCallbacks) {
    func();
   } else {
    Browser.queuedAsyncCallbacks.push(func);
   }
  }), timeout);
 }),
 safeSetInterval: (function(func, timeout) {
  Module["noExitRuntime"] = true;
  return setInterval((function() {
   if (ABORT) return;
   if (Browser.allowAsyncCallbacks) {
    func();
   }
  }), timeout);
 }),
 getMimetype: (function(name) {
  return {
   "jpg": "image/jpeg",
   "jpeg": "image/jpeg",
   "png": "image/png",
   "bmp": "image/bmp",
   "ogg": "audio/ogg",
   "wav": "audio/wav",
   "mp3": "audio/mpeg"
  }[name.substr(name.lastIndexOf(".") + 1)];
 }),
 getUserMedia: (function(func) {
  if (!window.getUserMedia) {
   window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"];
  }
  window.getUserMedia(func);
 }),
 getMovementX: (function(event) {
  return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
 }),
 getMovementY: (function(event) {
  return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
 }),
 getMouseWheelDelta: (function(event) {
  var delta = 0;
  switch (event.type) {
  case "DOMMouseScroll":
   delta = event.detail;
   break;
  case "mousewheel":
   delta = event.wheelDelta;
   break;
  case "wheel":
   delta = event["deltaY"];
   break;
  default:
   throw "unrecognized mouse wheel event: " + event.type;
  }
  return delta;
 }),
 mouseX: 0,
 mouseY: 0,
 mouseMovementX: 0,
 mouseMovementY: 0,
 touches: {},
 lastTouches: {},
 calculateMouseEvent: (function(event) {
  if (Browser.pointerLock) {
   if (event.type != "mousemove" && "mozMovementX" in event) {
    Browser.mouseMovementX = Browser.mouseMovementY = 0;
   } else {
    Browser.mouseMovementX = Browser.getMovementX(event);
    Browser.mouseMovementY = Browser.getMovementY(event);
   }
   if (typeof SDL != "undefined") {
    Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
    Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
   } else {
    Browser.mouseX += Browser.mouseMovementX;
    Browser.mouseY += Browser.mouseMovementY;
   }
  } else {
   var rect = Module["canvas"].getBoundingClientRect();
   var cw = Module["canvas"].width;
   var ch = Module["canvas"].height;
   var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
   var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
   if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
    var touch = event.touch;
    if (touch === undefined) {
     return;
    }
    var adjustedX = touch.pageX - (scrollX + rect.left);
    var adjustedY = touch.pageY - (scrollY + rect.top);
    adjustedX = adjustedX * (cw / rect.width);
    adjustedY = adjustedY * (ch / rect.height);
    var coords = {
     x: adjustedX,
     y: adjustedY
    };
    if (event.type === "touchstart") {
     Browser.lastTouches[touch.identifier] = coords;
     Browser.touches[touch.identifier] = coords;
    } else if (event.type === "touchend" || event.type === "touchmove") {
     Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
     Browser.touches[touch.identifier] = {
      x: adjustedX,
      y: adjustedY
     };
    }
    return;
   }
   var x = event.pageX - (scrollX + rect.left);
   var y = event.pageY - (scrollY + rect.top);
   x = x * (cw / rect.width);
   y = y * (ch / rect.height);
   Browser.mouseMovementX = x - Browser.mouseX;
   Browser.mouseMovementY = y - Browser.mouseY;
   Browser.mouseX = x;
   Browser.mouseY = y;
  }
 }),
 xhrLoad: (function(url, onload, onerror) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
   } else {
    onerror();
   }
  };
  xhr.onerror = onerror;
  xhr.send(null);
 }),
 asyncLoad: (function(url, onload, onerror, noRunDep) {
  Browser.xhrLoad(url, (function(arrayBuffer) {
   assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
   onload(new Uint8Array(arrayBuffer));
   if (!noRunDep) removeRunDependency("al " + url);
  }), (function(event) {
   if (onerror) {
    onerror();
   } else {
    throw 'Loading data file "' + url + '" failed.';
   }
  }));
  if (!noRunDep) addRunDependency("al " + url);
 }),
 resizeListeners: [],
 updateResizeListeners: (function() {
  var canvas = Module["canvas"];
  Browser.resizeListeners.forEach((function(listener) {
   listener(canvas.width, canvas.height);
  }));
 }),
 setCanvasSize: (function(width, height, noUpdates) {
  var canvas = Module["canvas"];
  Browser.updateCanvasDimensions(canvas, width, height);
  if (!noUpdates) Browser.updateResizeListeners();
 }),
 windowedWidth: 0,
 windowedHeight: 0,
 setFullScreenCanvasSize: (function() {
  if (typeof SDL != "undefined") {
   var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
   flags = flags | 8388608;
   HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags;
  }
  Browser.updateResizeListeners();
 }),
 setWindowedCanvasSize: (function() {
  if (typeof SDL != "undefined") {
   var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
   flags = flags & ~8388608;
   HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags;
  }
  Browser.updateResizeListeners();
 }),
 updateCanvasDimensions: (function(canvas, wNative, hNative) {
  if (wNative && hNative) {
   canvas.widthNative = wNative;
   canvas.heightNative = hNative;
  } else {
   wNative = canvas.widthNative;
   hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
   if (w / h < Module["forcedAspectRatio"]) {
    w = Math.round(h * Module["forcedAspectRatio"]);
   } else {
    h = Math.round(w / Module["forcedAspectRatio"]);
   }
  }
  if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
   var factor = Math.min(screen.width / w, screen.height / h);
   w = Math.round(w * factor);
   h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
   if (canvas.width != w) canvas.width = w;
   if (canvas.height != h) canvas.height = h;
   if (typeof canvas.style != "undefined") {
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
   }
  } else {
   if (canvas.width != wNative) canvas.width = wNative;
   if (canvas.height != hNative) canvas.height = hNative;
   if (typeof canvas.style != "undefined") {
    if (w != wNative || h != hNative) {
     canvas.style.setProperty("width", w + "px", "important");
     canvas.style.setProperty("height", h + "px", "important");
    } else {
     canvas.style.removeProperty("width");
     canvas.style.removeProperty("height");
    }
   }
  }
 }),
 wgetRequests: {},
 nextWgetRequestHandle: 0,
 getNextWgetRequestHandle: (function() {
  var handle = Browser.nextWgetRequestHandle;
  Browser.nextWgetRequestHandle++;
  return handle;
 })
};
Module["_bitshift64Ashr"] = _bitshift64Ashr;
Module["_bitshift64Lshr"] = _bitshift64Lshr;
function _recv(fd, buf, len, flags) {
 var sock = SOCKFS.getSocket(fd);
 if (!sock) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 return _read(fd, buf, len);
}
function _pread(fildes, buf, nbyte, offset) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.read(stream, slab, buf, nbyte, offset);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _read(fildes, buf, nbyte) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.read(stream, slab, buf, nbyte);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _fread(ptr, size, nitems, stream) {
 var bytesToRead = nitems * size;
 if (bytesToRead == 0) {
  return 0;
 }
 var bytesRead = 0;
 var streamObj = FS.getStreamFromPtr(stream);
 if (!streamObj) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return 0;
 }
 while (streamObj.ungotten.length && bytesToRead > 0) {
  HEAP8[ptr++ >> 0] = streamObj.ungotten.pop();
  bytesToRead--;
  bytesRead++;
 }
 var err = _read(streamObj.fd, ptr, bytesToRead);
 if (err == -1) {
  if (streamObj) streamObj.error = true;
  return 0;
 }
 bytesRead += err;
 if (bytesRead < bytesToRead) streamObj.eof = true;
 return bytesRead / size | 0;
}
var _BDtoIHigh = true;
function _pthread_cond_broadcast() {
 return 0;
}
function __isLeapYear(year) {
 return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function __arraySum(array, index) {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) ;
 return sum;
}
var __MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
var __MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
function __addDays(date, days) {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = __isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= daysInCurrentMonth - newDate.getDate() + 1;
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
}
function _strftime(s, maxsize, format, tm) {
 var tm_zone = HEAP32[tm + 40 >> 2];
 var date = {
  tm_sec: HEAP32[tm >> 2],
  tm_min: HEAP32[tm + 4 >> 2],
  tm_hour: HEAP32[tm + 8 >> 2],
  tm_mday: HEAP32[tm + 12 >> 2],
  tm_mon: HEAP32[tm + 16 >> 2],
  tm_year: HEAP32[tm + 20 >> 2],
  tm_wday: HEAP32[tm + 24 >> 2],
  tm_yday: HEAP32[tm + 28 >> 2],
  tm_isdst: HEAP32[tm + 32 >> 2],
  tm_gmtoff: HEAP32[tm + 36 >> 2],
  tm_zone: tm_zone ? Pointer_stringify(tm_zone) : ""
 };
 var pattern = Pointer_stringify(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value === "number" ? value.toString() : value || "";
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : value > 0 ? 1 : 0;
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);
  case 1:
   return janFourth;
  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);
  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);
  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);
  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);
  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   } else {
    return thisDate.getFullYear();
   }
  } else {
   return thisDate.getFullYear() - 1;
  }
 }
 var EXPANSION_RULES_2 = {
  "%a": (function(date) {
   return WEEKDAYS[date.tm_wday].substring(0, 3);
  }),
  "%A": (function(date) {
   return WEEKDAYS[date.tm_wday];
  }),
  "%b": (function(date) {
   return MONTHS[date.tm_mon].substring(0, 3);
  }),
  "%B": (function(date) {
   return MONTHS[date.tm_mon];
  }),
  "%C": (function(date) {
   var year = date.tm_year + 1900;
   return leadingNulls(year / 100 | 0, 2);
  }),
  "%d": (function(date) {
   return leadingNulls(date.tm_mday, 2);
  }),
  "%e": (function(date) {
   return leadingSomething(date.tm_mday, 2, " ");
  }),
  "%g": (function(date) {
   return getWeekBasedYear(date).toString().substring(2);
  }),
  "%G": (function(date) {
   return getWeekBasedYear(date);
  }),
  "%H": (function(date) {
   return leadingNulls(date.tm_hour, 2);
  }),
  "%I": (function(date) {
   return leadingNulls(date.tm_hour < 13 ? date.tm_hour : date.tm_hour - 12, 2);
  }),
  "%j": (function(date) {
   return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3);
  }),
  "%m": (function(date) {
   return leadingNulls(date.tm_mon + 1, 2);
  }),
  "%M": (function(date) {
   return leadingNulls(date.tm_min, 2);
  }),
  "%n": (function() {
   return "\n";
  }),
  "%p": (function(date) {
   if (date.tm_hour > 0 && date.tm_hour < 13) {
    return "AM";
   } else {
    return "PM";
   }
  }),
  "%S": (function(date) {
   return leadingNulls(date.tm_sec, 2);
  }),
  "%t": (function() {
   return "\t";
  }),
  "%u": (function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay() || 7;
  }),
  "%U": (function(date) {
   var janFirst = new Date(date.tm_year + 1900, 0, 1);
   var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstSunday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
    var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00";
  }),
  "%V": (function(date) {
   var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
   var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
   var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
   var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
   var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
   if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
    return "53";
   }
   if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
    return "01";
   }
   var daysDifference;
   if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
    daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate();
   } else {
    daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate();
   }
   return leadingNulls(Math.ceil(daysDifference / 7), 2);
  }),
  "%w": (function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay();
  }),
  "%W": (function(date) {
   var janFirst = new Date(date.tm_year, 0, 1);
   var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstMonday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
    var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00";
  }),
  "%y": (function(date) {
   return (date.tm_year + 1900).toString().substring(2);
  }),
  "%Y": (function(date) {
   return date.tm_year + 1900;
  }),
  "%z": (function(date) {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = off / 60 * 100 + off % 60;
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  }),
  "%Z": (function(date) {
   return date.tm_zone;
  }),
  "%%": (function() {
   return "%";
  })
 };
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.indexOf(rule) >= 0) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
}
function _strftime_l(s, maxsize, format, tm) {
 return _strftime(s, maxsize, format, tm);
}
function _vfprintf(s, f, va_arg) {
 return _fprintf(s, f, HEAP32[va_arg >> 2]);
}
function _pthread_mutex_unlock() {}
function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
 return dest;
}
Module["_memcpy"] = _memcpy;
var _llvm_pow_f64 = Math_pow;
function _sbrk(bytes) {
 var self = _sbrk;
 if (!self.called) {
  DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
  self.called = true;
  assert(Runtime.dynamicAlloc);
  self.alloc = Runtime.dynamicAlloc;
  Runtime.dynamicAlloc = (function() {
   abort("cannot dynamically allocate, sbrk now has control");
  });
 }
 var ret = DYNAMICTOP;
 if (bytes != 0) {
  var success = self.alloc(bytes);
  if (!success) return -1 >>> 0;
 }
 return ret;
}
Module["_bitshift64Shl"] = _bitshift64Shl;
var LOCALE = {
 curr: 0,
 check: (function(locale) {
  if (locale) locale = Pointer_stringify(locale);
  return locale === "C" || locale === "POSIX" || !locale;
 })
};
function _calloc(n, s) {
 var ret = _malloc(n * s);
 _memset(ret, 0, n * s);
 return ret;
}
Module["_calloc"] = _calloc;
function _newlocale(mask, locale, base) {
 if (!LOCALE.check(locale)) {
  ___setErrNo(ERRNO_CODES.ENOENT);
  return 0;
 }
 if (!base) base = _calloc(1, 4);
 return base;
}
Module["_memmove"] = _memmove;
function ___errno_location() {
 return ___errno_state;
}
var _BItoD = true;
function _catclose(catd) {
 return 0;
}
function _free() {}
Module["_free"] = _free;
function ___cxa_free_exception(ptr) {
 try {
  return _free(ptr);
 } catch (e) {}
}
function ___cxa_end_catch() {
 if (___cxa_end_catch.rethrown) {
  ___cxa_end_catch.rethrown = false;
  return;
 }
 asm["setThrew"](0);
 var ptr = EXCEPTIONS.caught.pop();
 if (ptr) {
  EXCEPTIONS.decRef(EXCEPTIONS.deAdjust(ptr));
  EXCEPTIONS.last = 0;
 }
}
function ___cxa_rethrow() {
 ___cxa_end_catch.rethrown = true;
 var ptr = EXCEPTIONS.caught.pop();
 EXCEPTIONS.last = ptr;
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
function ___cxa_guard_release() {}
function _ungetc(c, stream) {
 stream = FS.getStreamFromPtr(stream);
 if (!stream) {
  return -1;
 }
 if (c === -1) {
  return c;
 }
 c = unSign(c & 255);
 stream.ungotten.push(c);
 stream.eof = false;
 return c;
}
function _uselocale(locale) {
 var old = LOCALE.curr;
 if (locale) LOCALE.curr = locale;
 return old;
}
function ___assert_fail(condition, filename, line, func) {
 ABORT = true;
 throw "Assertion failed: " + Pointer_stringify(condition) + ", at: " + [ filename ? Pointer_stringify(filename) : "unknown filename", line, func ? Pointer_stringify(func) : "unknown function" ] + " at " + stackTrace();
}
Module["_memset"] = _memset;
var _BDtoILow = true;
function _strerror_r(errnum, strerrbuf, buflen) {
 if (errnum in ERRNO_MESSAGES) {
  if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
   return ___setErrNo(ERRNO_CODES.ERANGE);
  } else {
   var msg = ERRNO_MESSAGES[errnum];
   writeAsciiToMemory(msg, strerrbuf);
   return 0;
  }
 } else {
  return ___setErrNo(ERRNO_CODES.EINVAL);
 }
}
function _strerror(errnum) {
 if (!_strerror.buffer) _strerror.buffer = _malloc(256);
 _strerror_r(errnum, _strerror.buffer, 256);
 return _strerror.buffer;
}
function _abort() {
 Module["abort"]();
}
function _pthread_once(ptr, func) {
 if (!_pthread_once.seen) _pthread_once.seen = {};
 if (ptr in _pthread_once.seen) return;
 Runtime.dynCall("v", func);
 _pthread_once.seen[ptr] = 1;
}
function _pthread_cond_wait() {
 return 0;
}
var PTHREAD_SPECIFIC = {};
function _pthread_getspecific(key) {
 return PTHREAD_SPECIFIC[key] || 0;
}
function _clearerr(stream) {
 stream = FS.getStreamFromPtr(stream);
 if (!stream) {
  return;
 }
 stream.eof = false;
 stream.error = false;
}
var _fabs = Math_abs;
function _fgetc(stream) {
 var streamObj = FS.getStreamFromPtr(stream);
 if (!streamObj) return -1;
 if (streamObj.eof || streamObj.error) return -1;
 var ret = _fread(_fgetc.ret, 1, 1, stream);
 if (ret == 0) {
  return -1;
 } else if (ret == -1) {
  streamObj.error = true;
  return -1;
 } else {
  return HEAPU8[_fgetc.ret >> 0];
 }
}
function _getc() {
 return _fgetc.apply(null, arguments);
}
function __exit(status) {
 Module["exit"](status);
}
function _exit(status) {
 __exit(status);
}
function _pthread_setspecific(key, value) {
 if (!(key in PTHREAD_SPECIFIC)) {
  return ERRNO_CODES.EINVAL;
 }
 PTHREAD_SPECIFIC[key] = value;
 return 0;
}
function ___ctype_b_loc() {
 var me = ___ctype_b_loc;
 if (!me.ret) {
  var values = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 8195, 8194, 8194, 8194, 8194, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 24577, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 54536, 54536, 54536, 54536, 54536, 54536, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 49156, 49156, 49156, 49156, 49156, 49156, 54792, 54792, 54792, 54792, 54792, 54792, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 49156, 49156, 49156, 49156, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
  var i16size = 2;
  var arr = _malloc(values.length * i16size);
  for (var i = 0; i < values.length; i++) {
   HEAP16[arr + i * i16size >> 1] = values[i];
  }
  me.ret = allocate([ arr + 128 * i16size ], "i16*", ALLOC_NORMAL);
 }
 return me.ret;
}
function _freelocale(locale) {
 _free(locale);
}
function _malloc(bytes) {
 var ptr = Runtime.dynamicAlloc(bytes + 8);
 return ptr + 8 & 4294967288;
}
Module["_malloc"] = _malloc;
function ___cxa_allocate_exception(size) {
 return _malloc(size);
}
var _sin = Math_sin;
var _ceilf = Math_ceil;
function ___cxa_pure_virtual() {
 ABORT = true;
 throw "Pure virtual function called!";
}
function _catgets(catd, set_id, msg_id, s) {
 return s;
}
function _ferror(stream) {
 stream = FS.getStreamFromPtr(stream);
 return Number(stream && stream.error);
}
function _catopen(name, oflag) {
 return -1;
}
function ___ctype_toupper_loc() {
 var me = ___ctype_toupper_loc;
 if (!me.ret) {
  var values = [ 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255 ];
  var i32size = 4;
  var arr = _malloc(values.length * i32size);
  for (var i = 0; i < values.length; i++) {
   HEAP32[arr + i * i32size >> 2] = values[i];
  }
  me.ret = allocate([ arr + 128 * i32size ], "i32*", ALLOC_NORMAL);
 }
 return me.ret;
}
function ___cxa_guard_acquire(variable) {
 if (!HEAP8[variable >> 0]) {
  HEAP8[variable >> 0] = 1;
  return 1;
 }
 return 0;
}
function ___ctype_tolower_loc() {
 var me = ___ctype_tolower_loc;
 if (!me.ret) {
  var values = [ 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255 ];
  var i32size = 4;
  var arr = _malloc(values.length * i32size);
  for (var i = 0; i < values.length; i++) {
   HEAP32[arr + i * i32size >> 2] = values[i];
  }
  me.ret = allocate([ arr + 128 * i32size ], "i32*", ALLOC_NORMAL);
 }
 return me.ret;
}
function ___cxa_begin_catch(ptr) {
 __ZSt18uncaught_exceptionv.uncaught_exception--;
 EXCEPTIONS.caught.push(ptr);
 EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
 return ptr;
}
var _log = Math_log;
var _cos = Math_cos;
function _putchar(c) {
 return _fputc(c, HEAP32[_stdout >> 2]);
}
var PTHREAD_SPECIFIC_NEXT_KEY = 1;
function _pthread_key_create(key, destructor) {
 if (key == 0) {
  return ERRNO_CODES.EINVAL;
 }
 HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
 PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
 PTHREAD_SPECIFIC_NEXT_KEY++;
 return 0;
}
var _exp = Math_exp;
function _time(ptr) {
 var ret = Date.now() / 1e3 | 0;
 if (ptr) {
  HEAP32[ptr >> 2] = ret;
 }
 return ret;
}
var ___dso_handle = allocate(1, "i32*", ALLOC_STATIC);
FS.staticInit();
__ATINIT__.unshift({
 func: (function() {
  if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
 })
});
__ATMAIN__.push({
 func: (function() {
  FS.ignorePermissions = false;
 })
});
__ATEXIT__.push({
 func: (function() {
  FS.quit();
 })
});
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4);
HEAP32[___errno_state >> 2] = 0;
__ATINIT__.unshift({
 func: (function() {
  TTY.init();
 })
});
__ATEXIT__.push({
 func: (function() {
  TTY.shutdown();
 })
});
if (ENVIRONMENT_IS_NODE) {
 var fs = require("fs");
 var NODEJS_PATH = require("path");
 NODEFS.staticInit();
}
__ATINIT__.push({
 func: (function() {
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
 })
});
_fputc.ret = allocate([ 0 ], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) {
 Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice);
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
 Browser.requestAnimationFrame(func);
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
 Browser.setCanvasSize(width, height, noUpdates);
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
 Browser.mainLoop.pause();
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
 Browser.mainLoop.resume();
};
Module["getUserMedia"] = function Module_getUserMedia() {
 Browser.getUserMedia();
};
_fgetc.ret = allocate([ 0 ], "i8", ALLOC_STATIC);
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true;
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
var cttz_i8 = allocate([ 8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0 ], "i8", ALLOC_DYNAMIC);
function invoke_iiii(index, a1, a2, a3) {
 try {
  return Module["dynCall_iiii"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
 try {
  Module["dynCall_viiiiii"](index, a1, a2, a3, a4, a5, a6);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiii(index, a1, a2, a3, a4, a5) {
 try {
  Module["dynCall_viiiii"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiii(index, a1, a2, a3, a4) {
 try {
  Module["dynCall_viiii"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
 try {
  Module["dynCall_viiiiiii"](index, a1, a2, a3, a4, a5, a6, a7);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_di(index, a1) {
 try {
  return Module["dynCall_di"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_vi(index, a1) {
 try {
  Module["dynCall_vi"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_vii(index, a1, a2) {
 try {
  Module["dynCall_vii"](index, a1, a2);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
 try {
  Module["dynCall_viiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_ii(index, a1) {
 try {
  return Module["dynCall_ii"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiiid(index, a1, a2, a3, a4, a5, a6, a7) {
 try {
  Module["dynCall_viiiiiid"](index, a1, a2, a3, a4, a5, a6, a7);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viii(index, a1, a2, a3) {
 try {
  Module["dynCall_viii"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiid(index, a1, a2, a3, a4, a5, a6) {
 try {
  Module["dynCall_viiiiid"](index, a1, a2, a3, a4, a5, a6);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_v(index) {
 try {
  Module["dynCall_v"](index);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 try {
  return Module["dynCall_iiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiii(index, a1, a2, a3, a4) {
 try {
  return Module["dynCall_iiiii"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 try {
  Module["dynCall_viiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iidi(index, a1, a2, a3) {
 try {
  return Module["dynCall_iidi"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iii(index, a1, a2) {
 try {
  return Module["dynCall_iii"](index, a1, a2);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_id(index, a1) {
 try {
  return Module["dynCall_id"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
 try {
  return Module["dynCall_iiiiii"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
Module.asmGlobalArg = {
 "Math": Math,
 "Int8Array": Int8Array,
 "Int16Array": Int16Array,
 "Int32Array": Int32Array,
 "Uint8Array": Uint8Array,
 "Uint16Array": Uint16Array,
 "Uint32Array": Uint32Array,
 "Float32Array": Float32Array,
 "Float64Array": Float64Array,
 "NaN": NaN,
 "Infinity": Infinity
};
Module.asmLibraryArg = {
 "abort": abort,
 "assert": assert,
 "invoke_iiii": invoke_iiii,
 "invoke_viiiiii": invoke_viiiiii,
 "invoke_viiiii": invoke_viiiii,
 "invoke_viiii": invoke_viiii,
 "invoke_viiiiiii": invoke_viiiiiii,
 "invoke_di": invoke_di,
 "invoke_vi": invoke_vi,
 "invoke_vii": invoke_vii,
 "invoke_viiiiiiiii": invoke_viiiiiiiii,
 "invoke_ii": invoke_ii,
 "invoke_viiiiiid": invoke_viiiiiid,
 "invoke_viii": invoke_viii,
 "invoke_viiiiid": invoke_viiiiid,
 "invoke_v": invoke_v,
 "invoke_iiiiiiiii": invoke_iiiiiiiii,
 "invoke_iiiii": invoke_iiiii,
 "invoke_viiiiiiii": invoke_viiiiiiii,
 "invoke_iidi": invoke_iidi,
 "invoke_iii": invoke_iii,
 "invoke_id": invoke_id,
 "invoke_iiiiii": invoke_iiiiii,
 "_fabs": _fabs,
 "_pthread_getspecific": _pthread_getspecific,
 "_pthread_cond_wait": _pthread_cond_wait,
 "_sin": _sin,
 "_exp": _exp,
 "_llvm_pow_f64": _llvm_pow_f64,
 "_send": _send,
 "_fgetc": _fgetc,
 "_sqrtf": _sqrtf,
 "_fread": _fread,
 "___ctype_b_loc": ___ctype_b_loc,
 "___cxa_guard_acquire": ___cxa_guard_acquire,
 "___setErrNo": ___setErrNo,
 "_vfprintf": _vfprintf,
 "_pthread_setspecific": _pthread_setspecific,
 "_ungetc": _ungetc,
 "___assert_fail": ___assert_fail,
 "___cxa_free_exception": ___cxa_free_exception,
 "___cxa_allocate_exception": ___cxa_allocate_exception,
 "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv,
 "_strftime": _strftime,
 "_ceilf": _ceilf,
 "___ctype_toupper_loc": ___ctype_toupper_loc,
 "_fflush": _fflush,
 "___cxa_guard_release": ___cxa_guard_release,
 "_fputc": _fputc,
 "__addDays": __addDays,
 "___errno_location": ___errno_location,
 "_pwrite": _pwrite,
 "_strerror_r": _strerror_r,
 "_pthread_cond_broadcast": _pthread_cond_broadcast,
 "_strftime_l": _strftime_l,
 "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing,
 "_fabsf": _fabsf,
 "_sbrk": _sbrk,
 "_uselocale": _uselocale,
 "_catgets": _catgets,
 "_newlocale": _newlocale,
 "___cxa_begin_catch": ___cxa_begin_catch,
 "_emscripten_memcpy_big": _emscripten_memcpy_big,
 "___cxa_end_catch": ___cxa_end_catch,
 "___resumeException": ___resumeException,
 "___cxa_find_matching_catch": ___cxa_find_matching_catch,
 "_sysconf": _sysconf,
 "__reallyNegative": __reallyNegative,
 "_ferror": _ferror,
 "__arraySum": __arraySum,
 "_putchar": _putchar,
 "_cos": _cos,
 "_fprintf": _fprintf,
 "_fileno": _fileno,
 "_pthread_mutex_unlock": _pthread_mutex_unlock,
 "_pthread_once": _pthread_once,
 "_pread": _pread,
 "_puts": _puts,
 "_printf": _printf,
 "_floorf": _floorf,
 "_log": _log,
 "_getc": _getc,
 "_write": _write,
 "__isLeapYear": __isLeapYear,
 "_emscripten_set_main_loop": _emscripten_set_main_loop,
 "_mkport": _mkport,
 "_recv": _recv,
 "__exit": __exit,
 "_clearerr": _clearerr,
 "___cxa_atexit": ___cxa_atexit,
 "___ctype_tolower_loc": ___ctype_tolower_loc,
 "___cxa_throw": ___cxa_throw,
 "_freelocale": _freelocale,
 "_read": _read,
 "___cxa_rethrow": ___cxa_rethrow,
 "_abort": _abort,
 "_catclose": _catclose,
 "_fwrite": _fwrite,
 "_time": _time,
 "_pthread_mutex_lock": _pthread_mutex_lock,
 "_strerror": _strerror,
 "_pthread_key_create": _pthread_key_create,
 "__formatString": __formatString,
 "_atexit": _atexit,
 "_catopen": _catopen,
 "_exit": _exit,
 "___cxa_pure_virtual": ___cxa_pure_virtual,
 "_fputs": _fputs,
 "STACKTOP": STACKTOP,
 "STACK_MAX": STACK_MAX,
 "tempDoublePtr": tempDoublePtr,
 "ABORT": ABORT,
 "cttz_i8": cttz_i8,
 "___dso_handle": ___dso_handle,
 "_stderr": _stderr,
 "_stdin": _stdin,
 "_stdout": _stdout
};
Module.asmLibraryArg["EMTSTACKTOP"] = EMTSTACKTOP;
Module.asmLibraryArg["EMT_STACK_MAX"] = EMT_STACK_MAX;
// EMSCRIPTEN_START_ASM

var asm = (function(global,env,buffer) {

  'use asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;
  var ___dso_handle=env.___dso_handle|0;
  var _stderr=env._stderr|0;
  var _stdin=env._stdin|0;
  var _stdout=env._stdout|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var invoke_iiii=env.invoke_iiii;
  var invoke_viiiiii=env.invoke_viiiiii;
  var invoke_viiiii=env.invoke_viiiii;
  var invoke_viiii=env.invoke_viiii;
  var invoke_viiiiiii=env.invoke_viiiiiii;
  var invoke_di=env.invoke_di;
  var invoke_vi=env.invoke_vi;
  var invoke_vii=env.invoke_vii;
  var invoke_viiiiiiiii=env.invoke_viiiiiiiii;
  var invoke_ii=env.invoke_ii;
  var invoke_viiiiiid=env.invoke_viiiiiid;
  var invoke_viii=env.invoke_viii;
  var invoke_viiiiid=env.invoke_viiiiid;
  var invoke_v=env.invoke_v;
  var invoke_iiiiiiiii=env.invoke_iiiiiiiii;
  var invoke_iiiii=env.invoke_iiiii;
  var invoke_viiiiiiii=env.invoke_viiiiiiii;
  var invoke_iidi=env.invoke_iidi;
  var invoke_iii=env.invoke_iii;
  var invoke_id=env.invoke_id;
  var invoke_iiiiii=env.invoke_iiiiii;
  var _fabs=env._fabs;
  var _pthread_getspecific=env._pthread_getspecific;
  var _pthread_cond_wait=env._pthread_cond_wait;
  var _sin=env._sin;
  var _exp=env._exp;
  var _llvm_pow_f64=env._llvm_pow_f64;
  var _send=env._send;
  var _fgetc=env._fgetc;
  var _sqrtf=env._sqrtf;
  var _fread=env._fread;
  var ___ctype_b_loc=env.___ctype_b_loc;
  var ___cxa_guard_acquire=env.___cxa_guard_acquire;
  var ___setErrNo=env.___setErrNo;
  var _vfprintf=env._vfprintf;
  var _pthread_setspecific=env._pthread_setspecific;
  var _ungetc=env._ungetc;
  var ___assert_fail=env.___assert_fail;
  var ___cxa_free_exception=env.___cxa_free_exception;
  var ___cxa_allocate_exception=env.___cxa_allocate_exception;
  var __ZSt18uncaught_exceptionv=env.__ZSt18uncaught_exceptionv;
  var _strftime=env._strftime;
  var _ceilf=env._ceilf;
  var ___ctype_toupper_loc=env.___ctype_toupper_loc;
  var _fflush=env._fflush;
  var ___cxa_guard_release=env.___cxa_guard_release;
  var _fputc=env._fputc;
  var __addDays=env.__addDays;
  var ___errno_location=env.___errno_location;
  var _pwrite=env._pwrite;
  var _strerror_r=env._strerror_r;
  var _pthread_cond_broadcast=env._pthread_cond_broadcast;
  var _strftime_l=env._strftime_l;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _fabsf=env._fabsf;
  var _sbrk=env._sbrk;
  var _uselocale=env._uselocale;
  var _catgets=env._catgets;
  var _newlocale=env._newlocale;
  var ___cxa_begin_catch=env.___cxa_begin_catch;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var ___cxa_end_catch=env.___cxa_end_catch;
  var ___resumeException=env.___resumeException;
  var ___cxa_find_matching_catch=env.___cxa_find_matching_catch;
  var _sysconf=env._sysconf;
  var __reallyNegative=env.__reallyNegative;
  var _ferror=env._ferror;
  var __arraySum=env.__arraySum;
  var _putchar=env._putchar;
  var _cos=env._cos;
  var _fprintf=env._fprintf;
  var _fileno=env._fileno;
  var _pthread_mutex_unlock=env._pthread_mutex_unlock;
  var _pthread_once=env._pthread_once;
  var _pread=env._pread;
  var _puts=env._puts;
  var _printf=env._printf;
  var _floorf=env._floorf;
  var _log=env._log;
  var _getc=env._getc;
  var _write=env._write;
  var __isLeapYear=env.__isLeapYear;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _mkport=env._mkport;
  var _recv=env._recv;
  var __exit=env.__exit;
  var _clearerr=env._clearerr;
  var ___cxa_atexit=env.___cxa_atexit;
  var ___ctype_tolower_loc=env.___ctype_tolower_loc;
  var ___cxa_throw=env.___cxa_throw;
  var _freelocale=env._freelocale;
  var _read=env._read;
  var ___cxa_rethrow=env.___cxa_rethrow;
  var _abort=env._abort;
  var _catclose=env._catclose;
  var _fwrite=env._fwrite;
  var _time=env._time;
  var _pthread_mutex_lock=env._pthread_mutex_lock;
  var _strerror=env._strerror;
  var _pthread_key_create=env._pthread_key_create;
  var __formatString=env.__formatString;
  var _atexit=env._atexit;
  var _catopen=env._catopen;
  var _exit=env._exit;
  var ___cxa_pure_virtual=env.___cxa_pure_virtual;
  var _fputs=env._fputs;
  var tempFloat = 0.0;

var EMTSTACKTOP = env.EMTSTACKTOP|0;
var EMT_STACK_MAX = env.EMT_STACK_MAX|0;
// EMSCRIPTEN_START_FUNCS

function _malloc($bytes) {
 $bytes = $bytes | 0;
 var $$lcssa = 0, $$lcssa112 = 0, $$lcssa116 = 0, $$lcssa117 = 0, $$lcssa118 = 0, $$lcssa120 = 0, $$lcssa123 = 0, $$lcssa125 = 0, $$lcssa127 = 0, $$lcssa130 = 0, $$lcssa132 = 0, $$lcssa134 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0, $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0, $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0, $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$014$i$i$lcssa = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$052$i$i = 0, $T$052$i$i$lcssa = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$0$i$i$lcssa = 0, $sp$074$i = 0, $sp$074$i$lcssa = 0, $sp$173$i = 0, $sp$173$i$lcssa = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0, label = 0, sp = 0;
 label = 0;
 sp = STACKTOP;
 $0 = $bytes >>> 0 < 245;
 do {
  if ($0) {
   $1 = $bytes >>> 0 < 11;
   if ($1) {
    $5 = 16;
   } else {
    $2 = $bytes + 11 | 0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[147e3 >> 2] | 0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8 | 0) == 0;
   if (!$9) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = $11 + $4 | 0;
    $13 = $12 << 1;
    $14 = (147e3 + ($13 << 2) | 0) + 40 | 0;
    $$sum10 = $13 + 2 | 0;
    $15 = (147e3 + ($$sum10 << 2) | 0) + 40 | 0;
    $16 = HEAP32[$15 >> 2] | 0;
    $17 = $16 + 8 | 0;
    $18 = HEAP32[$17 >> 2] | 0;
    $19 = ($14 | 0) == ($18 | 0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[147e3 >> 2] = $22;
     } else {
      $23 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
      $24 = $18 >>> 0 < $23 >>> 0;
      if ($24) {
       _abort();
      }
      $25 = $18 + 12 | 0;
      $26 = HEAP32[$25 >> 2] | 0;
      $27 = ($26 | 0) == ($16 | 0);
      if ($27) {
       HEAP32[$25 >> 2] = $14;
       HEAP32[$15 >> 2] = $18;
       break;
      } else {
       _abort();
      }
     }
    } while (0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = $16 + 4 | 0;
    HEAP32[$30 >> 2] = $29;
    $$sum1112 = $28 | 4;
    $31 = $16 + $$sum1112 | 0;
    $32 = HEAP32[$31 >> 2] | 0;
    $33 = $32 | 1;
    HEAP32[$31 >> 2] = $33;
    $mem$0 = $17;
    return $mem$0 | 0;
   }
   $34 = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
   $35 = $5 >>> 0 > $34 >>> 0;
   if ($35) {
    $36 = ($7 | 0) == 0;
    if (!$36) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = 0 - $38 | 0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = 0 - $41 | 0;
     $43 = $41 & $42;
     $44 = $43 + -1 | 0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = $62 + $63 | 0;
     $65 = $64 << 1;
     $66 = (147e3 + ($65 << 2) | 0) + 40 | 0;
     $$sum4 = $65 + 2 | 0;
     $67 = (147e3 + ($$sum4 << 2) | 0) + 40 | 0;
     $68 = HEAP32[$67 >> 2] | 0;
     $69 = $68 + 8 | 0;
     $70 = HEAP32[$69 >> 2] | 0;
     $71 = ($66 | 0) == ($70 | 0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[147e3 >> 2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
       $76 = $70 >>> 0 < $75 >>> 0;
       if ($76) {
        _abort();
       }
       $77 = $70 + 12 | 0;
       $78 = HEAP32[$77 >> 2] | 0;
       $79 = ($78 | 0) == ($68 | 0);
       if ($79) {
        HEAP32[$77 >> 2] = $66;
        HEAP32[$67 >> 2] = $70;
        $$pre = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
        $89 = $$pre;
        break;
       } else {
        _abort();
       }
      }
     } while (0);
     $80 = $64 << 3;
     $81 = $80 - $5 | 0;
     $82 = $5 | 3;
     $83 = $68 + 4 | 0;
     HEAP32[$83 >> 2] = $82;
     $84 = $68 + $5 | 0;
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = $68 + $$sum56 | 0;
     HEAP32[$86 >> 2] = $85;
     $87 = $68 + $80 | 0;
     HEAP32[$87 >> 2] = $81;
     $88 = ($89 | 0) == 0;
     if (!$88) {
      $90 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = (147e3 + ($92 << 2) | 0) + 40 | 0;
      $94 = HEAP32[147e3 >> 2] | 0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96 | 0) == 0;
      if ($97) {
       $98 = $94 | $95;
       HEAP32[147e3 >> 2] = $98;
       $$sum8$pre = $92 + 2 | 0;
       $$pre105 = (147e3 + ($$sum8$pre << 2) | 0) + 40 | 0;
       $$pre$phiZ2D = $$pre105;
       $F4$0 = $93;
      } else {
       $$sum9 = $92 + 2 | 0;
       $99 = (147e3 + ($$sum9 << 2) | 0) + 40 | 0;
       $100 = HEAP32[$99 >> 2] | 0;
       $101 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
       $102 = $100 >>> 0 < $101 >>> 0;
       if ($102) {
        _abort();
       } else {
        $$pre$phiZ2D = $99;
        $F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D >> 2] = $90;
      $103 = $F4$0 + 12 | 0;
      HEAP32[$103 >> 2] = $90;
      $104 = $90 + 8 | 0;
      HEAP32[$104 >> 2] = $F4$0;
      $105 = $90 + 12 | 0;
      HEAP32[$105 >> 2] = $93;
     }
     HEAP32[(147e3 + 8 | 0) >> 2] = $81;
     HEAP32[(147e3 + 20 | 0) >> 2] = $84;
     $mem$0 = $69;
     return $mem$0 | 0;
    }
    $106 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
    $107 = ($106 | 0) == 0;
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = 0 - $106 | 0;
     $109 = $106 & $108;
     $110 = $109 + -1 | 0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = $128 + $129 | 0;
     $131 = (147e3 + ($130 << 2) | 0) + 304 | 0;
     $132 = HEAP32[$131 >> 2] | 0;
     $133 = $132 + 4 | 0;
     $134 = HEAP32[$133 >> 2] | 0;
     $135 = $134 & -8;
     $136 = $135 - $5 | 0;
     $rsize$0$i = $136;
     $t$0$i = $132;
     $v$0$i = $132;
     while (1) {
      $137 = $t$0$i + 16 | 0;
      $138 = HEAP32[$137 >> 2] | 0;
      $139 = ($138 | 0) == (0 | 0);
      if ($139) {
       $140 = $t$0$i + 20 | 0;
       $141 = HEAP32[$140 >> 2] | 0;
       $142 = ($141 | 0) == (0 | 0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;
        $v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = $144 + 4 | 0;
      $145 = HEAP32[$143 >> 2] | 0;
      $146 = $145 & -8;
      $147 = $146 - $5 | 0;
      $148 = $147 >>> 0 < $rsize$0$i >>> 0;
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;
      $t$0$i = $144;
      $v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $150 = $v$0$i$lcssa >>> 0 < $149 >>> 0;
     if ($150) {
      _abort();
     }
     $151 = $v$0$i$lcssa + $5 | 0;
     $152 = $v$0$i$lcssa >>> 0 < $151 >>> 0;
     if (!$152) {
      _abort();
     }
     $153 = $v$0$i$lcssa + 24 | 0;
     $154 = HEAP32[$153 >> 2] | 0;
     $155 = $v$0$i$lcssa + 12 | 0;
     $156 = HEAP32[$155 >> 2] | 0;
     $157 = ($156 | 0) == ($v$0$i$lcssa | 0);
     do {
      if ($157) {
       $167 = $v$0$i$lcssa + 20 | 0;
       $168 = HEAP32[$167 >> 2] | 0;
       $169 = ($168 | 0) == (0 | 0);
       if ($169) {
        $170 = $v$0$i$lcssa + 16 | 0;
        $171 = HEAP32[$170 >> 2] | 0;
        $172 = ($171 | 0) == (0 | 0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;
         $RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;
        $RP$0$i = $167;
       }
       while (1) {
        $173 = $R$0$i + 20 | 0;
        $174 = HEAP32[$173 >> 2] | 0;
        $175 = ($174 | 0) == (0 | 0);
        if (!$175) {
         $R$0$i = $174;
         $RP$0$i = $173;
         continue;
        }
        $176 = $R$0$i + 16 | 0;
        $177 = HEAP32[$176 >> 2] | 0;
        $178 = ($177 | 0) == (0 | 0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;
         $RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;
         $RP$0$i = $176;
        }
       }
       $179 = $RP$0$i$lcssa >>> 0 < $149 >>> 0;
       if ($179) {
        _abort();
       } else {
        HEAP32[$RP$0$i$lcssa >> 2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = $v$0$i$lcssa + 8 | 0;
       $159 = HEAP32[$158 >> 2] | 0;
       $160 = $159 >>> 0 < $149 >>> 0;
       if ($160) {
        _abort();
       }
       $161 = $159 + 12 | 0;
       $162 = HEAP32[$161 >> 2] | 0;
       $163 = ($162 | 0) == ($v$0$i$lcssa | 0);
       if (!$163) {
        _abort();
       }
       $164 = $156 + 8 | 0;
       $165 = HEAP32[$164 >> 2] | 0;
       $166 = ($165 | 0) == ($v$0$i$lcssa | 0);
       if ($166) {
        HEAP32[$161 >> 2] = $156;
        HEAP32[$164 >> 2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
       }
      }
     } while (0);
     $180 = ($154 | 0) == (0 | 0);
     do {
      if (!$180) {
       $181 = $v$0$i$lcssa + 28 | 0;
       $182 = HEAP32[$181 >> 2] | 0;
       $183 = (147e3 + ($182 << 2) | 0) + 304 | 0;
       $184 = HEAP32[$183 >> 2] | 0;
       $185 = ($v$0$i$lcssa | 0) == ($184 | 0);
       if ($185) {
        HEAP32[$183 >> 2] = $R$1$i;
        $cond$i = ($R$1$i | 0) == (0 | 0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
         $189 = $188 & $187;
         HEAP32[(147e3 + 4 | 0) >> 2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
        $191 = $154 >>> 0 < $190 >>> 0;
        if ($191) {
         _abort();
        }
        $192 = $154 + 16 | 0;
        $193 = HEAP32[$192 >> 2] | 0;
        $194 = ($193 | 0) == ($v$0$i$lcssa | 0);
        if ($194) {
         HEAP32[$192 >> 2] = $R$1$i;
        } else {
         $195 = $154 + 20 | 0;
         HEAP32[$195 >> 2] = $R$1$i;
        }
        $196 = ($R$1$i | 0) == (0 | 0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
       $198 = $R$1$i >>> 0 < $197 >>> 0;
       if ($198) {
        _abort();
       }
       $199 = $R$1$i + 24 | 0;
       HEAP32[$199 >> 2] = $154;
       $200 = $v$0$i$lcssa + 16 | 0;
       $201 = HEAP32[$200 >> 2] | 0;
       $202 = ($201 | 0) == (0 | 0);
       do {
        if (!$202) {
         $203 = $201 >>> 0 < $197 >>> 0;
         if ($203) {
          _abort();
         } else {
          $204 = $R$1$i + 16 | 0;
          HEAP32[$204 >> 2] = $201;
          $205 = $201 + 24 | 0;
          HEAP32[$205 >> 2] = $R$1$i;
          break;
         }
        }
       } while (0);
       $206 = $v$0$i$lcssa + 20 | 0;
       $207 = HEAP32[$206 >> 2] | 0;
       $208 = ($207 | 0) == (0 | 0);
       if (!$208) {
        $209 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
        $210 = $207 >>> 0 < $209 >>> 0;
        if ($210) {
         _abort();
        } else {
         $211 = $R$1$i + 20 | 0;
         HEAP32[$211 >> 2] = $207;
         $212 = $207 + 24 | 0;
         HEAP32[$212 >> 2] = $R$1$i;
         break;
        }
       }
      }
     } while (0);
     $213 = $rsize$0$i$lcssa >>> 0 < 16;
     if ($213) {
      $214 = $rsize$0$i$lcssa + $5 | 0;
      $215 = $214 | 3;
      $216 = $v$0$i$lcssa + 4 | 0;
      HEAP32[$216 >> 2] = $215;
      $$sum4$i = $214 + 4 | 0;
      $217 = $v$0$i$lcssa + $$sum4$i | 0;
      $218 = HEAP32[$217 >> 2] | 0;
      $219 = $218 | 1;
      HEAP32[$217 >> 2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = $v$0$i$lcssa + 4 | 0;
      HEAP32[$221 >> 2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i39 = $5 | 4;
      $223 = $v$0$i$lcssa + $$sum$i39 | 0;
      HEAP32[$223 >> 2] = $222;
      $$sum1$i = $rsize$0$i$lcssa + $5 | 0;
      $224 = $v$0$i$lcssa + $$sum1$i | 0;
      HEAP32[$224 >> 2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
      $226 = ($225 | 0) == 0;
      if (!$226) {
       $227 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (147e3 + ($229 << 2) | 0) + 40 | 0;
       $231 = HEAP32[147e3 >> 2] | 0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233 | 0) == 0;
       if ($234) {
        $235 = $231 | $232;
        HEAP32[147e3 >> 2] = $235;
        $$sum2$pre$i = $229 + 2 | 0;
        $$pre$i = (147e3 + ($$sum2$pre$i << 2) | 0) + 40 | 0;
        $$pre$phi$iZ2D = $$pre$i;
        $F1$0$i = $230;
       } else {
        $$sum3$i = $229 + 2 | 0;
        $236 = (147e3 + ($$sum3$i << 2) | 0) + 40 | 0;
        $237 = HEAP32[$236 >> 2] | 0;
        $238 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
        $239 = $237 >>> 0 < $238 >>> 0;
        if ($239) {
         _abort();
        } else {
         $$pre$phi$iZ2D = $236;
         $F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D >> 2] = $227;
       $240 = $F1$0$i + 12 | 0;
       HEAP32[$240 >> 2] = $227;
       $241 = $227 + 8 | 0;
       HEAP32[$241 >> 2] = $F1$0$i;
       $242 = $227 + 12 | 0;
       HEAP32[$242 >> 2] = $230;
      }
      HEAP32[(147e3 + 8 | 0) >> 2] = $rsize$0$i$lcssa;
      HEAP32[(147e3 + 20 | 0) >> 2] = $151;
     }
     $243 = $v$0$i$lcssa + 8 | 0;
     $mem$0 = $243;
     return $mem$0 | 0;
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = $bytes >>> 0 > 4294967231;
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = $bytes + 11 | 0;
    $246 = $245 & -8;
    $247 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
    $248 = ($247 | 0) == 0;
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = 0 - $246 | 0;
     $250 = $245 >>> 8;
     $251 = ($250 | 0) == 0;
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = $246 >>> 0 > 16777215;
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = $250 + 1048320 | 0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = $256 + 520192 | 0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = $261 + 245760 | 0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = 14 - $265 | 0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = $266 + $268 | 0;
       $270 = $269 << 1;
       $271 = $269 + 7 | 0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (147e3 + ($idx$0$i << 2) | 0) + 304 | 0;
     $276 = HEAP32[$275 >> 2] | 0;
     $277 = ($276 | 0) == (0 | 0);
     L126 : do {
      if ($277) {
       $rsize$2$i = $249;
       $t$1$i = 0;
       $v$2$i = 0;
      } else {
       $278 = ($idx$0$i | 0) == 31;
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = 25 - $279 | 0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;
       $rst$0$i = 0;
       $sizebits$0$i = $281;
       $t$0$i14 = $276;
       $v$0$i16 = 0;
       while (1) {
        $283 = $t$0$i14 + 4 | 0;
        $284 = HEAP32[$283 >> 2] | 0;
        $285 = $284 & -8;
        $286 = $285 - $246 | 0;
        $287 = $286 >>> 0 < $rsize$0$i15 >>> 0;
        if ($287) {
         $288 = ($285 | 0) == ($246 | 0);
         if ($288) {
          $rsize$2$i = $286;
          $t$1$i = $t$0$i14;
          $v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;
          $v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;
         $v$1$i = $v$0$i16;
        }
        $289 = $t$0$i14 + 20 | 0;
        $290 = HEAP32[$289 >> 2] | 0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ($t$0$i14 + ($291 << 2) | 0) + 16 | 0;
        $293 = HEAP32[$292 >> 2] | 0;
        $294 = ($290 | 0) == (0 | 0);
        $295 = ($290 | 0) == ($293 | 0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293 | 0) == (0 | 0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;
         $t$1$i = $rst$1$i;
         $v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;
         $rst$0$i = $rst$1$i;
         $sizebits$0$i = $297;
         $t$0$i14 = $293;
         $v$0$i16 = $v$1$i;
        }
       }
      }
     } while (0);
     $298 = ($t$1$i | 0) == (0 | 0);
     $299 = ($v$2$i | 0) == (0 | 0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = 0 - $300 | 0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303 | 0) == 0;
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = 0 - $303 | 0;
      $306 = $303 & $305;
      $307 = $306 + -1 | 0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = $325 + $326 | 0;
      $328 = (147e3 + ($327 << 2) | 0) + 304 | 0;
      $329 = HEAP32[$328 >> 2] | 0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i | 0) == (0 | 0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;
      $v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;
      $t$230$i = $t$2$ph$i;
      $v$332$i = $v$2$i;
      while (1) {
       $331 = $t$230$i + 4 | 0;
       $332 = HEAP32[$331 >> 2] | 0;
       $333 = $332 & -8;
       $334 = $333 - $246 | 0;
       $335 = $334 >>> 0 < $rsize$331$i >>> 0;
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = $t$230$i + 16 | 0;
       $337 = HEAP32[$336 >> 2] | 0;
       $338 = ($337 | 0) == (0 | 0);
       if (!$338) {
        $rsize$331$i = $$rsize$3$i;
        $t$230$i = $337;
        $v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = $t$230$i + 20 | 0;
       $340 = HEAP32[$339 >> 2] | 0;
       $341 = ($340 | 0) == (0 | 0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;
        $v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;
        $t$230$i = $340;
        $v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i | 0) == (0 | 0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
      $344 = $343 - $246 | 0;
      $345 = $rsize$3$lcssa$i >>> 0 < $344 >>> 0;
      if ($345) {
       $346 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
       $347 = $v$3$lcssa$i >>> 0 < $346 >>> 0;
       if ($347) {
        _abort();
       }
       $348 = $v$3$lcssa$i + $246 | 0;
       $349 = $v$3$lcssa$i >>> 0 < $348 >>> 0;
       if (!$349) {
        _abort();
       }
       $350 = $v$3$lcssa$i + 24 | 0;
       $351 = HEAP32[$350 >> 2] | 0;
       $352 = $v$3$lcssa$i + 12 | 0;
       $353 = HEAP32[$352 >> 2] | 0;
       $354 = ($353 | 0) == ($v$3$lcssa$i | 0);
       do {
        if ($354) {
         $364 = $v$3$lcssa$i + 20 | 0;
         $365 = HEAP32[$364 >> 2] | 0;
         $366 = ($365 | 0) == (0 | 0);
         if ($366) {
          $367 = $v$3$lcssa$i + 16 | 0;
          $368 = HEAP32[$367 >> 2] | 0;
          $369 = ($368 | 0) == (0 | 0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;
           $RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;
          $RP$0$i17 = $364;
         }
         while (1) {
          $370 = $R$0$i18 + 20 | 0;
          $371 = HEAP32[$370 >> 2] | 0;
          $372 = ($371 | 0) == (0 | 0);
          if (!$372) {
           $R$0$i18 = $371;
           $RP$0$i17 = $370;
           continue;
          }
          $373 = $R$0$i18 + 16 | 0;
          $374 = HEAP32[$373 >> 2] | 0;
          $375 = ($374 | 0) == (0 | 0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;
           $RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;
           $RP$0$i17 = $373;
          }
         }
         $376 = $RP$0$i17$lcssa >>> 0 < $346 >>> 0;
         if ($376) {
          _abort();
         } else {
          HEAP32[$RP$0$i17$lcssa >> 2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = $v$3$lcssa$i + 8 | 0;
         $356 = HEAP32[$355 >> 2] | 0;
         $357 = $356 >>> 0 < $346 >>> 0;
         if ($357) {
          _abort();
         }
         $358 = $356 + 12 | 0;
         $359 = HEAP32[$358 >> 2] | 0;
         $360 = ($359 | 0) == ($v$3$lcssa$i | 0);
         if (!$360) {
          _abort();
         }
         $361 = $353 + 8 | 0;
         $362 = HEAP32[$361 >> 2] | 0;
         $363 = ($362 | 0) == ($v$3$lcssa$i | 0);
         if ($363) {
          HEAP32[$358 >> 2] = $353;
          HEAP32[$361 >> 2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
         }
        }
       } while (0);
       $377 = ($351 | 0) == (0 | 0);
       do {
        if (!$377) {
         $378 = $v$3$lcssa$i + 28 | 0;
         $379 = HEAP32[$378 >> 2] | 0;
         $380 = (147e3 + ($379 << 2) | 0) + 304 | 0;
         $381 = HEAP32[$380 >> 2] | 0;
         $382 = ($v$3$lcssa$i | 0) == ($381 | 0);
         if ($382) {
          HEAP32[$380 >> 2] = $R$1$i20;
          $cond$i21 = ($R$1$i20 | 0) == (0 | 0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
           $386 = $385 & $384;
           HEAP32[(147e3 + 4 | 0) >> 2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
          $388 = $351 >>> 0 < $387 >>> 0;
          if ($388) {
           _abort();
          }
          $389 = $351 + 16 | 0;
          $390 = HEAP32[$389 >> 2] | 0;
          $391 = ($390 | 0) == ($v$3$lcssa$i | 0);
          if ($391) {
           HEAP32[$389 >> 2] = $R$1$i20;
          } else {
           $392 = $351 + 20 | 0;
           HEAP32[$392 >> 2] = $R$1$i20;
          }
          $393 = ($R$1$i20 | 0) == (0 | 0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
         $395 = $R$1$i20 >>> 0 < $394 >>> 0;
         if ($395) {
          _abort();
         }
         $396 = $R$1$i20 + 24 | 0;
         HEAP32[$396 >> 2] = $351;
         $397 = $v$3$lcssa$i + 16 | 0;
         $398 = HEAP32[$397 >> 2] | 0;
         $399 = ($398 | 0) == (0 | 0);
         do {
          if (!$399) {
           $400 = $398 >>> 0 < $394 >>> 0;
           if ($400) {
            _abort();
           } else {
            $401 = $R$1$i20 + 16 | 0;
            HEAP32[$401 >> 2] = $398;
            $402 = $398 + 24 | 0;
            HEAP32[$402 >> 2] = $R$1$i20;
            break;
           }
          }
         } while (0);
         $403 = $v$3$lcssa$i + 20 | 0;
         $404 = HEAP32[$403 >> 2] | 0;
         $405 = ($404 | 0) == (0 | 0);
         if (!$405) {
          $406 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
          $407 = $404 >>> 0 < $406 >>> 0;
          if ($407) {
           _abort();
          } else {
           $408 = $R$1$i20 + 20 | 0;
           HEAP32[$408 >> 2] = $404;
           $409 = $404 + 24 | 0;
           HEAP32[$409 >> 2] = $R$1$i20;
           break;
          }
         }
        }
       } while (0);
       $410 = $rsize$3$lcssa$i >>> 0 < 16;
       L204 : do {
        if ($410) {
         $411 = $rsize$3$lcssa$i + $246 | 0;
         $412 = $411 | 3;
         $413 = $v$3$lcssa$i + 4 | 0;
         HEAP32[$413 >> 2] = $412;
         $$sum18$i = $411 + 4 | 0;
         $414 = $v$3$lcssa$i + $$sum18$i | 0;
         $415 = HEAP32[$414 >> 2] | 0;
         $416 = $415 | 1;
         HEAP32[$414 >> 2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = $v$3$lcssa$i + 4 | 0;
         HEAP32[$418 >> 2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = $v$3$lcssa$i + $$sum$i2338 | 0;
         HEAP32[$420 >> 2] = $419;
         $$sum1$i24 = $rsize$3$lcssa$i + $246 | 0;
         $421 = $v$3$lcssa$i + $$sum1$i24 | 0;
         HEAP32[$421 >> 2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = $rsize$3$lcssa$i >>> 0 < 256;
         if ($423) {
          $424 = $422 << 1;
          $425 = (147e3 + ($424 << 2) | 0) + 40 | 0;
          $426 = HEAP32[147e3 >> 2] | 0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428 | 0) == 0;
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[147e3 >> 2] = $430;
            $$sum14$pre$i = $424 + 2 | 0;
            $$pre$i25 = (147e3 + ($$sum14$pre$i << 2) | 0) + 40 | 0;
            $$pre$phi$i26Z2D = $$pre$i25;
            $F5$0$i = $425;
           } else {
            $$sum17$i = $424 + 2 | 0;
            $431 = (147e3 + ($$sum17$i << 2) | 0) + 40 | 0;
            $432 = HEAP32[$431 >> 2] | 0;
            $433 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
            $434 = $432 >>> 0 < $433 >>> 0;
            if (!$434) {
             $$pre$phi$i26Z2D = $431;
             $F5$0$i = $432;
             break;
            }
            _abort();
           }
          } while (0);
          HEAP32[$$pre$phi$i26Z2D >> 2] = $348;
          $435 = $F5$0$i + 12 | 0;
          HEAP32[$435 >> 2] = $348;
          $$sum15$i = $246 + 8 | 0;
          $436 = $v$3$lcssa$i + $$sum15$i | 0;
          HEAP32[$436 >> 2] = $F5$0$i;
          $$sum16$i = $246 + 12 | 0;
          $437 = $v$3$lcssa$i + $$sum16$i | 0;
          HEAP32[$437 >> 2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438 | 0) == 0;
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = $rsize$3$lcssa$i >>> 0 > 16777215;
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = $438 + 1048320 | 0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = $444 + 520192 | 0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = $449 + 245760 | 0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = 14 - $453 | 0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = $454 + $456 | 0;
           $458 = $457 << 1;
           $459 = $457 + 7 | 0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (147e3 + ($I7$0$i << 2) | 0) + 304 | 0;
         $$sum2$i = $246 + 28 | 0;
         $464 = $v$3$lcssa$i + $$sum2$i | 0;
         HEAP32[$464 >> 2] = $I7$0$i;
         $$sum3$i27 = $246 + 16 | 0;
         $465 = $v$3$lcssa$i + $$sum3$i27 | 0;
         $$sum4$i28 = $246 + 20 | 0;
         $466 = $v$3$lcssa$i + $$sum4$i28 | 0;
         HEAP32[$466 >> 2] = 0;
         HEAP32[$465 >> 2] = 0;
         $467 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469 | 0) == 0;
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(147e3 + 4 | 0) >> 2] = $471;
          HEAP32[$463 >> 2] = $348;
          $$sum5$i = $246 + 24 | 0;
          $472 = $v$3$lcssa$i + $$sum5$i | 0;
          HEAP32[$472 >> 2] = $463;
          $$sum6$i = $246 + 12 | 0;
          $473 = $v$3$lcssa$i + $$sum6$i | 0;
          HEAP32[$473 >> 2] = $348;
          $$sum7$i = $246 + 8 | 0;
          $474 = $v$3$lcssa$i + $$sum7$i | 0;
          HEAP32[$474 >> 2] = $348;
          break;
         }
         $475 = HEAP32[$463 >> 2] | 0;
         $476 = ($I7$0$i | 0) == 31;
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = 25 - $477 | 0;
          $484 = $478;
         }
         $479 = $475 + 4 | 0;
         $480 = HEAP32[$479 >> 2] | 0;
         $481 = $480 & -8;
         $482 = ($481 | 0) == ($rsize$3$lcssa$i | 0);
         L225 : do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$029$i = $483;
           $T$028$i = $475;
           while (1) {
            $491 = $K12$029$i >>> 31;
            $492 = ($T$028$i + ($491 << 2) | 0) + 16 | 0;
            $487 = HEAP32[$492 >> 2] | 0;
            $493 = ($487 | 0) == (0 | 0);
            if ($493) {
             $$lcssa134 = $492;
             $T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = $487 + 4 | 0;
            $488 = HEAP32[$486 >> 2] | 0;
            $489 = $488 & -8;
            $490 = ($489 | 0) == ($rsize$3$lcssa$i | 0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$029$i = $485;
             $T$028$i = $487;
            }
           }
           $494 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
           $495 = $$lcssa134 >>> 0 < $494 >>> 0;
           if ($495) {
            _abort();
           } else {
            HEAP32[$$lcssa134 >> 2] = $348;
            $$sum11$i = $246 + 24 | 0;
            $496 = $v$3$lcssa$i + $$sum11$i | 0;
            HEAP32[$496 >> 2] = $T$028$i$lcssa;
            $$sum12$i = $246 + 12 | 0;
            $497 = $v$3$lcssa$i + $$sum12$i | 0;
            HEAP32[$497 >> 2] = $348;
            $$sum13$i = $246 + 8 | 0;
            $498 = $v$3$lcssa$i + $$sum13$i | 0;
            HEAP32[$498 >> 2] = $348;
            break L204;
           }
          }
         } while (0);
         $499 = $T$0$lcssa$i + 8 | 0;
         $500 = HEAP32[$499 >> 2] | 0;
         $501 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
         $502 = $T$0$lcssa$i >>> 0 >= $501 >>> 0;
         $503 = $500 >>> 0 >= $501 >>> 0;
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = $500 + 12 | 0;
          HEAP32[$504 >> 2] = $348;
          HEAP32[$499 >> 2] = $348;
          $$sum8$i = $246 + 8 | 0;
          $505 = $v$3$lcssa$i + $$sum8$i | 0;
          HEAP32[$505 >> 2] = $500;
          $$sum9$i = $246 + 12 | 0;
          $506 = $v$3$lcssa$i + $$sum9$i | 0;
          HEAP32[$506 >> 2] = $T$0$lcssa$i;
          $$sum10$i = $246 + 24 | 0;
          $507 = $v$3$lcssa$i + $$sum10$i | 0;
          HEAP32[$507 >> 2] = 0;
          break;
         } else {
          _abort();
         }
        }
       } while (0);
       $508 = $v$3$lcssa$i + 8 | 0;
       $mem$0 = $508;
       return $mem$0 | 0;
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while (0);
 $509 = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
 $510 = $509 >>> 0 < $nb$0 >>> 0;
 if (!$510) {
  $511 = $509 - $nb$0 | 0;
  $512 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
  $513 = $511 >>> 0 > 15;
  if ($513) {
   $514 = $512 + $nb$0 | 0;
   HEAP32[(147e3 + 20 | 0) >> 2] = $514;
   HEAP32[(147e3 + 8 | 0) >> 2] = $511;
   $515 = $511 | 1;
   $$sum2 = $nb$0 + 4 | 0;
   $516 = $512 + $$sum2 | 0;
   HEAP32[$516 >> 2] = $515;
   $517 = $512 + $509 | 0;
   HEAP32[$517 >> 2] = $511;
   $518 = $nb$0 | 3;
   $519 = $512 + 4 | 0;
   HEAP32[$519 >> 2] = $518;
  } else {
   HEAP32[(147e3 + 8 | 0) >> 2] = 0;
   HEAP32[(147e3 + 20 | 0) >> 2] = 0;
   $520 = $509 | 3;
   $521 = $512 + 4 | 0;
   HEAP32[$521 >> 2] = $520;
   $$sum1 = $509 + 4 | 0;
   $522 = $512 + $$sum1 | 0;
   $523 = HEAP32[$522 >> 2] | 0;
   $524 = $523 | 1;
   HEAP32[$522 >> 2] = $524;
  }
  $525 = $512 + 8 | 0;
  $mem$0 = $525;
  return $mem$0 | 0;
 }
 $526 = HEAP32[(147e3 + 12 | 0) >> 2] | 0;
 $527 = $526 >>> 0 > $nb$0 >>> 0;
 if ($527) {
  $528 = $526 - $nb$0 | 0;
  HEAP32[(147e3 + 12 | 0) >> 2] = $528;
  $529 = HEAP32[(147e3 + 24 | 0) >> 2] | 0;
  $530 = $529 + $nb$0 | 0;
  HEAP32[(147e3 + 24 | 0) >> 2] = $530;
  $531 = $528 | 1;
  $$sum = $nb$0 + 4 | 0;
  $532 = $529 + $$sum | 0;
  HEAP32[$532 >> 2] = $531;
  $533 = $nb$0 | 3;
  $534 = $529 + 4 | 0;
  HEAP32[$534 >> 2] = $533;
  $535 = $529 + 8 | 0;
  $mem$0 = $535;
  return $mem$0 | 0;
 }
 $536 = HEAP32[147472 >> 2] | 0;
 $537 = ($536 | 0) == 0;
 do {
  if ($537) {
   $538 = _sysconf(30) | 0;
   $539 = $538 + -1 | 0;
   $540 = $539 & $538;
   $541 = ($540 | 0) == 0;
   if ($541) {
    HEAP32[(147472 + 8 | 0) >> 2] = $538;
    HEAP32[(147472 + 4 | 0) >> 2] = $538;
    HEAP32[(147472 + 12 | 0) >> 2] = -1;
    HEAP32[(147472 + 16 | 0) >> 2] = -1;
    HEAP32[(147472 + 20 | 0) >> 2] = 0;
    HEAP32[(147e3 + 444 | 0) >> 2] = 0;
    $542 = _time(0 | 0) | 0;
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[147472 >> 2] = $544;
    break;
   } else {
    _abort();
   }
  }
 } while (0);
 $545 = $nb$0 + 48 | 0;
 $546 = HEAP32[(147472 + 8 | 0) >> 2] | 0;
 $547 = $nb$0 + 47 | 0;
 $548 = $546 + $547 | 0;
 $549 = 0 - $546 | 0;
 $550 = $548 & $549;
 $551 = $550 >>> 0 > $nb$0 >>> 0;
 if (!$551) {
  $mem$0 = 0;
  return $mem$0 | 0;
 }
 $552 = HEAP32[(147e3 + 440 | 0) >> 2] | 0;
 $553 = ($552 | 0) == 0;
 if (!$553) {
  $554 = HEAP32[(147e3 + 432 | 0) >> 2] | 0;
  $555 = $554 + $550 | 0;
  $556 = $555 >>> 0 <= $554 >>> 0;
  $557 = $555 >>> 0 > $552 >>> 0;
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return $mem$0 | 0;
  }
 }
 $558 = HEAP32[(147e3 + 444 | 0) >> 2] | 0;
 $559 = $558 & 4;
 $560 = ($559 | 0) == 0;
 L266 : do {
  if ($560) {
   $561 = HEAP32[(147e3 + 24 | 0) >> 2] | 0;
   $562 = ($561 | 0) == (0 | 0);
   L268 : do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = 147e3 + 448 | 0;
     while (1) {
      $563 = HEAP32[$sp$0$i$i >> 2] | 0;
      $564 = $563 >>> 0 > $561 >>> 0;
      if (!$564) {
       $565 = $sp$0$i$i + 4 | 0;
       $566 = HEAP32[$565 >> 2] | 0;
       $567 = $563 + $566 | 0;
       $568 = $567 >>> 0 > $561 >>> 0;
       if ($568) {
        $$lcssa130 = $sp$0$i$i;
        $$lcssa132 = $565;
        $sp$0$i$i$lcssa = $sp$0$i$i;
        break;
       }
      }
      $569 = $sp$0$i$i + 8 | 0;
      $570 = HEAP32[$569 >> 2] | 0;
      $571 = ($570 | 0) == (0 | 0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i$lcssa | 0) == (0 | 0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[(147e3 + 12 | 0) >> 2] | 0;
      $596 = $548 - $595 | 0;
      $597 = $596 & $549;
      $598 = $597 >>> 0 < 2147483647;
      if ($598) {
       $599 = _sbrk($597 | 0) | 0;
       $600 = HEAP32[$$lcssa130 >> 2] | 0;
       $601 = HEAP32[$$lcssa132 >> 2] | 0;
       $602 = $600 + $601 | 0;
       $603 = ($599 | 0) == ($602 | 0);
       if ($603) {
        $br$0$i = $599;
        $ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;
        $ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while (0);
   do {
    if ((label | 0) == 181) {
     $573 = _sbrk(0) | 0;
     $574 = ($573 | 0) == (-1 | 0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[(147472 + 4 | 0) >> 2] | 0;
      $577 = $576 + -1 | 0;
      $578 = $577 & $575;
      $579 = ($578 | 0) == 0;
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = $577 + $575 | 0;
       $581 = 0 - $576 | 0;
       $582 = $580 & $581;
       $583 = $550 - $575 | 0;
       $584 = $583 + $582 | 0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[(147e3 + 432 | 0) >> 2] | 0;
      $586 = $585 + $ssize$0$i | 0;
      $587 = $ssize$0$i >>> 0 > $nb$0 >>> 0;
      $588 = $ssize$0$i >>> 0 < 2147483647;
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[(147e3 + 440 | 0) >> 2] | 0;
       $590 = ($589 | 0) == 0;
       if (!$590) {
        $591 = $586 >>> 0 <= $585 >>> 0;
        $592 = $586 >>> 0 > $589 >>> 0;
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = _sbrk($ssize$0$i | 0) | 0;
       $594 = ($593 | 0) == ($573 | 0);
       if ($594) {
        $br$0$i = $573;
        $ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;
        $ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while (0);
   L288 : do {
    if ((label | 0) == 190) {
     $604 = ($br$0$i | 0) == (-1 | 0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;
      $tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    } else if ((label | 0) == 191) {
     $605 = 0 - $ssize$129$i | 0;
     $606 = ($br$030$i | 0) != (-1 | 0);
     $607 = $ssize$129$i >>> 0 < 2147483647;
     $or$cond5$i = $606 & $607;
     $608 = $545 >>> 0 > $ssize$129$i >>> 0;
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[(147472 + 8 | 0) >> 2] | 0;
       $610 = $547 - $ssize$129$i | 0;
       $611 = $610 + $609 | 0;
       $612 = 0 - $609 | 0;
       $613 = $611 & $612;
       $614 = $613 >>> 0 < 2147483647;
       if ($614) {
        $615 = _sbrk($613 | 0) | 0;
        $616 = ($615 | 0) == (-1 | 0);
        if ($616) {
         _sbrk($605 | 0) | 0;
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = $613 + $ssize$129$i | 0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while (0);
     $618 = ($br$030$i | 0) == (-1 | 0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;
      $tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while (0);
   $619 = HEAP32[(147e3 + 444 | 0) >> 2] | 0;
   $620 = $619 | 4;
   HEAP32[(147e3 + 444 | 0) >> 2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while (0);
 if ((label | 0) == 198) {
  $621 = $550 >>> 0 < 2147483647;
  if ($621) {
   $622 = _sbrk($550 | 0) | 0;
   $623 = _sbrk(0) | 0;
   $624 = ($622 | 0) != (-1 | 0);
   $625 = ($623 | 0) != (-1 | 0);
   $or$cond3$i = $624 & $625;
   $626 = $622 >>> 0 < $623 >>> 0;
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = $627 - $628 | 0;
    $630 = $nb$0 + 40 | 0;
    $631 = $629 >>> 0 > $630 >>> 0;
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;
     $tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label | 0) == 201) {
  $632 = HEAP32[(147e3 + 432 | 0) >> 2] | 0;
  $633 = $632 + $tsize$244$i | 0;
  HEAP32[(147e3 + 432 | 0) >> 2] = $633;
  $634 = HEAP32[(147e3 + 436 | 0) >> 2] | 0;
  $635 = $633 >>> 0 > $634 >>> 0;
  if ($635) {
   HEAP32[(147e3 + 436 | 0) >> 2] = $633;
  }
  $636 = HEAP32[(147e3 + 24 | 0) >> 2] | 0;
  $637 = ($636 | 0) == (0 | 0);
  L308 : do {
   if ($637) {
    $638 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
    $639 = ($638 | 0) == (0 | 0);
    $640 = $tbase$245$i >>> 0 < $638 >>> 0;
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[(147e3 + 16 | 0) >> 2] = $tbase$245$i;
    }
    HEAP32[(147e3 + 448 | 0) >> 2] = $tbase$245$i;
    HEAP32[(147e3 + 452 | 0) >> 2] = $tsize$244$i;
    HEAP32[(147e3 + 460 | 0) >> 2] = 0;
    $641 = HEAP32[147472 >> 2] | 0;
    HEAP32[(147e3 + 36 | 0) >> 2] = $641;
    HEAP32[(147e3 + 32 | 0) >> 2] = -1;
    $i$02$i$i = 0;
    while (1) {
     $642 = $i$02$i$i << 1;
     $643 = (147e3 + ($642 << 2) | 0) + 40 | 0;
     $$sum$i$i = $642 + 3 | 0;
     $644 = (147e3 + ($$sum$i$i << 2) | 0) + 40 | 0;
     HEAP32[$644 >> 2] = $643;
     $$sum1$i$i = $642 + 2 | 0;
     $645 = (147e3 + ($$sum1$i$i << 2) | 0) + 40 | 0;
     HEAP32[$645 >> 2] = $643;
     $646 = $i$02$i$i + 1 | 0;
     $exitcond$i$i = ($646 | 0) == 32;
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = $tsize$244$i + -40 | 0;
    $648 = $tbase$245$i + 8 | 0;
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650 | 0) == 0;
    if ($651) {
     $655 = 0;
    } else {
     $652 = 0 - $649 | 0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = $tbase$245$i + $655 | 0;
    $656 = $647 - $655 | 0;
    HEAP32[(147e3 + 24 | 0) >> 2] = $654;
    HEAP32[(147e3 + 12 | 0) >> 2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = $655 + 4 | 0;
    $658 = $tbase$245$i + $$sum$i12$i | 0;
    HEAP32[$658 >> 2] = $657;
    $$sum2$i$i = $tsize$244$i + -36 | 0;
    $659 = $tbase$245$i + $$sum2$i$i | 0;
    HEAP32[$659 >> 2] = 40;
    $660 = HEAP32[(147472 + 16 | 0) >> 2] | 0;
    HEAP32[(147e3 + 28 | 0) >> 2] = $660;
   } else {
    $sp$074$i = 147e3 + 448 | 0;
    while (1) {
     $661 = HEAP32[$sp$074$i >> 2] | 0;
     $662 = $sp$074$i + 4 | 0;
     $663 = HEAP32[$662 >> 2] | 0;
     $664 = $661 + $663 | 0;
     $665 = ($tbase$245$i | 0) == ($664 | 0);
     if ($665) {
      $$lcssa123 = $661;
      $$lcssa125 = $662;
      $$lcssa127 = $663;
      $sp$074$i$lcssa = $sp$074$i;
      label = 213;
      break;
     }
     $666 = $sp$074$i + 8 | 0;
     $667 = HEAP32[$666 >> 2] | 0;
     $668 = ($667 | 0) == (0 | 0);
     if ($668) {
      break;
     } else {
      $sp$074$i = $667;
     }
    }
    if ((label | 0) == 213) {
     $669 = $sp$074$i$lcssa + 12 | 0;
     $670 = HEAP32[$669 >> 2] | 0;
     $671 = $670 & 8;
     $672 = ($671 | 0) == 0;
     if ($672) {
      $673 = $636 >>> 0 >= $$lcssa123 >>> 0;
      $674 = $636 >>> 0 < $tbase$245$i >>> 0;
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = $$lcssa127 + $tsize$244$i | 0;
       HEAP32[$$lcssa125 >> 2] = $675;
       $676 = HEAP32[(147e3 + 12 | 0) >> 2] | 0;
       $677 = $676 + $tsize$244$i | 0;
       $678 = $636 + 8 | 0;
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680 | 0) == 0;
       if ($681) {
        $685 = 0;
       } else {
        $682 = 0 - $679 | 0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = $636 + $685 | 0;
       $686 = $677 - $685 | 0;
       HEAP32[(147e3 + 24 | 0) >> 2] = $684;
       HEAP32[(147e3 + 12 | 0) >> 2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = $685 + 4 | 0;
       $688 = $636 + $$sum$i16$i | 0;
       HEAP32[$688 >> 2] = $687;
       $$sum2$i17$i = $677 + 4 | 0;
       $689 = $636 + $$sum2$i17$i | 0;
       HEAP32[$689 >> 2] = 40;
       $690 = HEAP32[(147472 + 16 | 0) >> 2] | 0;
       HEAP32[(147e3 + 28 | 0) >> 2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
    $692 = $tbase$245$i >>> 0 < $691 >>> 0;
    if ($692) {
     HEAP32[(147e3 + 16 | 0) >> 2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = $tbase$245$i + $tsize$244$i | 0;
    $sp$173$i = 147e3 + 448 | 0;
    while (1) {
     $694 = HEAP32[$sp$173$i >> 2] | 0;
     $695 = ($694 | 0) == ($693 | 0);
     if ($695) {
      $$lcssa120 = $sp$173$i;
      $sp$173$i$lcssa = $sp$173$i;
      label = 223;
      break;
     }
     $696 = $sp$173$i + 8 | 0;
     $697 = HEAP32[$696 >> 2] | 0;
     $698 = ($697 | 0) == (0 | 0);
     if ($698) {
      break;
     } else {
      $sp$173$i = $697;
     }
    }
    if ((label | 0) == 223) {
     $699 = $sp$173$i$lcssa + 12 | 0;
     $700 = HEAP32[$699 >> 2] | 0;
     $701 = $700 & 8;
     $702 = ($701 | 0) == 0;
     if ($702) {
      HEAP32[$$lcssa120 >> 2] = $tbase$245$i;
      $703 = $sp$173$i$lcssa + 4 | 0;
      $704 = HEAP32[$703 >> 2] | 0;
      $705 = $704 + $tsize$244$i | 0;
      HEAP32[$703 >> 2] = $705;
      $706 = $tbase$245$i + 8 | 0;
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708 | 0) == 0;
      if ($709) {
       $713 = 0;
      } else {
       $710 = 0 - $707 | 0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = $tbase$245$i + $713 | 0;
      $$sum102$i = $tsize$244$i + 8 | 0;
      $714 = $tbase$245$i + $$sum102$i | 0;
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716 | 0) == 0;
      if ($717) {
       $720 = 0;
      } else {
       $718 = 0 - $715 | 0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = $720 + $tsize$244$i | 0;
      $721 = $tbase$245$i + $$sum103$i | 0;
      $722 = $721;
      $723 = $712;
      $724 = $722 - $723 | 0;
      $$sum$i19$i = $713 + $nb$0 | 0;
      $725 = $tbase$245$i + $$sum$i19$i | 0;
      $726 = $724 - $nb$0 | 0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = $713 + 4 | 0;
      $728 = $tbase$245$i + $$sum1$i20$i | 0;
      HEAP32[$728 >> 2] = $727;
      $729 = ($721 | 0) == ($636 | 0);
      L345 : do {
       if ($729) {
        $730 = HEAP32[(147e3 + 12 | 0) >> 2] | 0;
        $731 = $730 + $726 | 0;
        HEAP32[(147e3 + 12 | 0) >> 2] = $731;
        HEAP32[(147e3 + 24 | 0) >> 2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = $$sum$i19$i + 4 | 0;
        $733 = $tbase$245$i + $$sum42$i$i | 0;
        HEAP32[$733 >> 2] = $732;
       } else {
        $734 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
        $735 = ($721 | 0) == ($734 | 0);
        if ($735) {
         $736 = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
         $737 = $736 + $726 | 0;
         HEAP32[(147e3 + 8 | 0) >> 2] = $737;
         HEAP32[(147e3 + 20 | 0) >> 2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = $$sum$i19$i + 4 | 0;
         $739 = $tbase$245$i + $$sum40$i$i | 0;
         HEAP32[$739 >> 2] = $738;
         $$sum41$i$i = $737 + $$sum$i19$i | 0;
         $740 = $tbase$245$i + $$sum41$i$i | 0;
         HEAP32[$740 >> 2] = $737;
         break;
        }
        $$sum2$i21$i = $tsize$244$i + 4 | 0;
        $$sum104$i = $$sum2$i21$i + $720 | 0;
        $741 = $tbase$245$i + $$sum104$i | 0;
        $742 = HEAP32[$741 >> 2] | 0;
        $743 = $742 & 3;
        $744 = ($743 | 0) == 1;
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = $742 >>> 0 < 256;
         L353 : do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = $$sum3738$i$i + $tsize$244$i | 0;
           $748 = $tbase$245$i + $$sum114$i | 0;
           $749 = HEAP32[$748 >> 2] | 0;
           $$sum39$i$i = $tsize$244$i + 12 | 0;
           $$sum115$i = $$sum39$i$i + $720 | 0;
           $750 = $tbase$245$i + $$sum115$i | 0;
           $751 = HEAP32[$750 >> 2] | 0;
           $752 = $746 << 1;
           $753 = (147e3 + ($752 << 2) | 0) + 40 | 0;
           $754 = ($749 | 0) == ($753 | 0);
           do {
            if (!$754) {
             $755 = $749 >>> 0 < $756 >>> 0;
             if ($755) {
              _abort();
             }
             $757 = $749 + 12 | 0;
             $758 = HEAP32[$757 >> 2] | 0;
             $759 = ($758 | 0) == ($721 | 0);
             if ($759) {
              break;
             }
             _abort();
            }
           } while (0);
           $760 = ($751 | 0) == ($749 | 0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[147e3 >> 2] | 0;
            $764 = $763 & $762;
            HEAP32[147e3 >> 2] = $764;
            break;
           }
           $765 = ($751 | 0) == ($753 | 0);
           do {
            if ($765) {
             $$pre58$i$i = $751 + 8 | 0;
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = $751 >>> 0 < $756 >>> 0;
             if ($766) {
              _abort();
             }
             $767 = $751 + 8 | 0;
             $768 = HEAP32[$767 >> 2] | 0;
             $769 = ($768 | 0) == ($721 | 0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
            }
           } while (0);
           $770 = $749 + 12 | 0;
           HEAP32[$770 >> 2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D >> 2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = $$sum34$i$i + $tsize$244$i | 0;
           $771 = $tbase$245$i + $$sum105$i | 0;
           $772 = HEAP32[$771 >> 2] | 0;
           $$sum5$i$i = $tsize$244$i + 12 | 0;
           $$sum106$i = $$sum5$i$i + $720 | 0;
           $773 = $tbase$245$i + $$sum106$i | 0;
           $774 = HEAP32[$773 >> 2] | 0;
           $775 = ($774 | 0) == ($721 | 0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = $$sum2$i21$i + $$sum67$i$i | 0;
             $785 = $tbase$245$i + $$sum112$i | 0;
             $786 = HEAP32[$785 >> 2] | 0;
             $787 = ($786 | 0) == (0 | 0);
             if ($787) {
              $$sum113$i = $$sum67$i$i + $tsize$244$i | 0;
              $788 = $tbase$245$i + $$sum113$i | 0;
              $789 = HEAP32[$788 >> 2] | 0;
              $790 = ($789 | 0) == (0 | 0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;
               $RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;
              $RP$0$i$i = $785;
             }
             while (1) {
              $791 = $R$0$i$i + 20 | 0;
              $792 = HEAP32[$791 >> 2] | 0;
              $793 = ($792 | 0) == (0 | 0);
              if (!$793) {
               $R$0$i$i = $792;
               $RP$0$i$i = $791;
               continue;
              }
              $794 = $R$0$i$i + 16 | 0;
              $795 = HEAP32[$794 >> 2] | 0;
              $796 = ($795 | 0) == (0 | 0);
              if ($796) {
               $R$0$i$i$lcssa = $R$0$i$i;
               $RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $795;
               $RP$0$i$i = $794;
              }
             }
             $797 = $RP$0$i$i$lcssa >>> 0 < $756 >>> 0;
             if ($797) {
              _abort();
             } else {
              HEAP32[$RP$0$i$i$lcssa >> 2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = $$sum3536$i$i + $tsize$244$i | 0;
             $776 = $tbase$245$i + $$sum107$i | 0;
             $777 = HEAP32[$776 >> 2] | 0;
             $778 = $777 >>> 0 < $756 >>> 0;
             if ($778) {
              _abort();
             }
             $779 = $777 + 12 | 0;
             $780 = HEAP32[$779 >> 2] | 0;
             $781 = ($780 | 0) == ($721 | 0);
             if (!$781) {
              _abort();
             }
             $782 = $774 + 8 | 0;
             $783 = HEAP32[$782 >> 2] | 0;
             $784 = ($783 | 0) == ($721 | 0);
             if ($784) {
              HEAP32[$779 >> 2] = $774;
              HEAP32[$782 >> 2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
             }
            }
           } while (0);
           $798 = ($772 | 0) == (0 | 0);
           if ($798) {
            break;
           }
           $$sum30$i$i = $tsize$244$i + 28 | 0;
           $$sum108$i = $$sum30$i$i + $720 | 0;
           $799 = $tbase$245$i + $$sum108$i | 0;
           $800 = HEAP32[$799 >> 2] | 0;
           $801 = (147e3 + ($800 << 2) | 0) + 304 | 0;
           $802 = HEAP32[$801 >> 2] | 0;
           $803 = ($721 | 0) == ($802 | 0);
           do {
            if ($803) {
             HEAP32[$801 >> 2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i | 0) == (0 | 0);
             if (!$cond$i$i) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
             $807 = $806 & $805;
             HEAP32[(147e3 + 4 | 0) >> 2] = $807;
             break L353;
            } else {
             $808 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
             $809 = $772 >>> 0 < $808 >>> 0;
             if ($809) {
              _abort();
             }
             $810 = $772 + 16 | 0;
             $811 = HEAP32[$810 >> 2] | 0;
             $812 = ($811 | 0) == ($721 | 0);
             if ($812) {
              HEAP32[$810 >> 2] = $R$1$i$i;
             } else {
              $813 = $772 + 20 | 0;
              HEAP32[$813 >> 2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i | 0) == (0 | 0);
             if ($814) {
              break L353;
             }
            }
           } while (0);
           $815 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
           $816 = $R$1$i$i >>> 0 < $815 >>> 0;
           if ($816) {
            _abort();
           }
           $817 = $R$1$i$i + 24 | 0;
           HEAP32[$817 >> 2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = $$sum3132$i$i + $tsize$244$i | 0;
           $818 = $tbase$245$i + $$sum109$i | 0;
           $819 = HEAP32[$818 >> 2] | 0;
           $820 = ($819 | 0) == (0 | 0);
           do {
            if (!$820) {
             $821 = $819 >>> 0 < $815 >>> 0;
             if ($821) {
              _abort();
             } else {
              $822 = $R$1$i$i + 16 | 0;
              HEAP32[$822 >> 2] = $819;
              $823 = $819 + 24 | 0;
              HEAP32[$823 >> 2] = $R$1$i$i;
              break;
             }
            }
           } while (0);
           $$sum110$i = $$sum2$i21$i + $$sum3132$i$i | 0;
           $824 = $tbase$245$i + $$sum110$i | 0;
           $825 = HEAP32[$824 >> 2] | 0;
           $826 = ($825 | 0) == (0 | 0);
           if ($826) {
            break;
           }
           $827 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
           $828 = $825 >>> 0 < $827 >>> 0;
           if ($828) {
            _abort();
           } else {
            $829 = $R$1$i$i + 20 | 0;
            HEAP32[$829 >> 2] = $825;
            $830 = $825 + 24 | 0;
            HEAP32[$830 >> 2] = $R$1$i$i;
            break;
           }
          }
         } while (0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = $$sum9$i$i + $tsize$244$i | 0;
         $831 = $tbase$245$i + $$sum111$i | 0;
         $832 = $745 + $726 | 0;
         $oldfirst$0$i$i = $831;
         $qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;
         $qsize$0$i$i = $726;
        }
        $833 = $oldfirst$0$i$i + 4 | 0;
        $834 = HEAP32[$833 >> 2] | 0;
        $835 = $834 & -2;
        HEAP32[$833 >> 2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = $$sum$i19$i + 4 | 0;
        $837 = $tbase$245$i + $$sum10$i$i | 0;
        HEAP32[$837 >> 2] = $836;
        $$sum11$i22$i = $qsize$0$i$i + $$sum$i19$i | 0;
        $838 = $tbase$245$i + $$sum11$i22$i | 0;
        HEAP32[$838 >> 2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = $qsize$0$i$i >>> 0 < 256;
        if ($840) {
         $841 = $839 << 1;
         $842 = (147e3 + ($841 << 2) | 0) + 40 | 0;
         $843 = HEAP32[147e3 >> 2] | 0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845 | 0) == 0;
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[147e3 >> 2] = $847;
           $$sum26$pre$i$i = $841 + 2 | 0;
           $$pre$i23$i = (147e3 + ($$sum26$pre$i$i << 2) | 0) + 40 | 0;
           $$pre$phi$i24$iZ2D = $$pre$i23$i;
           $F4$0$i$i = $842;
          } else {
           $$sum29$i$i = $841 + 2 | 0;
           $848 = (147e3 + ($$sum29$i$i << 2) | 0) + 40 | 0;
           $849 = HEAP32[$848 >> 2] | 0;
           $850 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
           $851 = $849 >>> 0 < $850 >>> 0;
           if (!$851) {
            $$pre$phi$i24$iZ2D = $848;
            $F4$0$i$i = $849;
            break;
           }
           _abort();
          }
         } while (0);
         HEAP32[$$pre$phi$i24$iZ2D >> 2] = $725;
         $852 = $F4$0$i$i + 12 | 0;
         HEAP32[$852 >> 2] = $725;
         $$sum27$i$i = $$sum$i19$i + 8 | 0;
         $853 = $tbase$245$i + $$sum27$i$i | 0;
         HEAP32[$853 >> 2] = $F4$0$i$i;
         $$sum28$i$i = $$sum$i19$i + 12 | 0;
         $854 = $tbase$245$i + $$sum28$i$i | 0;
         HEAP32[$854 >> 2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855 | 0) == 0;
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = $qsize$0$i$i >>> 0 > 16777215;
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = $855 + 1048320 | 0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = $861 + 520192 | 0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = $866 + 245760 | 0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = 14 - $870 | 0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = $871 + $873 | 0;
          $875 = $874 << 1;
          $876 = $874 + 7 | 0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while (0);
        $880 = (147e3 + ($I7$0$i$i << 2) | 0) + 304 | 0;
        $$sum12$i$i = $$sum$i19$i + 28 | 0;
        $881 = $tbase$245$i + $$sum12$i$i | 0;
        HEAP32[$881 >> 2] = $I7$0$i$i;
        $$sum13$i$i = $$sum$i19$i + 16 | 0;
        $882 = $tbase$245$i + $$sum13$i$i | 0;
        $$sum14$i$i = $$sum$i19$i + 20 | 0;
        $883 = $tbase$245$i + $$sum14$i$i | 0;
        HEAP32[$883 >> 2] = 0;
        HEAP32[$882 >> 2] = 0;
        $884 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886 | 0) == 0;
        if ($887) {
         $888 = $884 | $885;
         HEAP32[(147e3 + 4 | 0) >> 2] = $888;
         HEAP32[$880 >> 2] = $725;
         $$sum15$i$i = $$sum$i19$i + 24 | 0;
         $889 = $tbase$245$i + $$sum15$i$i | 0;
         HEAP32[$889 >> 2] = $880;
         $$sum16$i$i = $$sum$i19$i + 12 | 0;
         $890 = $tbase$245$i + $$sum16$i$i | 0;
         HEAP32[$890 >> 2] = $725;
         $$sum17$i$i = $$sum$i19$i + 8 | 0;
         $891 = $tbase$245$i + $$sum17$i$i | 0;
         HEAP32[$891 >> 2] = $725;
         break;
        }
        $892 = HEAP32[$880 >> 2] | 0;
        $893 = ($I7$0$i$i | 0) == 31;
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = 25 - $894 | 0;
         $901 = $895;
        }
        $896 = $892 + 4 | 0;
        $897 = HEAP32[$896 >> 2] | 0;
        $898 = $897 & -8;
        $899 = ($898 | 0) == ($qsize$0$i$i | 0);
        L442 : do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;
          $T$052$i$i = $892;
          while (1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ($T$052$i$i + ($908 << 2) | 0) + 16 | 0;
           $904 = HEAP32[$909 >> 2] | 0;
           $910 = ($904 | 0) == (0 | 0);
           if ($910) {
            $$lcssa = $909;
            $T$052$i$i$lcssa = $T$052$i$i;
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = $904 + 4 | 0;
           $905 = HEAP32[$903 >> 2] | 0;
           $906 = $905 & -8;
           $907 = ($906 | 0) == ($qsize$0$i$i | 0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L442;
           } else {
            $K8$053$i$i = $902;
            $T$052$i$i = $904;
           }
          }
          $911 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
          $912 = $$lcssa >>> 0 < $911 >>> 0;
          if ($912) {
           _abort();
          } else {
           HEAP32[$$lcssa >> 2] = $725;
           $$sum23$i$i = $$sum$i19$i + 24 | 0;
           $913 = $tbase$245$i + $$sum23$i$i | 0;
           HEAP32[$913 >> 2] = $T$052$i$i$lcssa;
           $$sum24$i$i = $$sum$i19$i + 12 | 0;
           $914 = $tbase$245$i + $$sum24$i$i | 0;
           HEAP32[$914 >> 2] = $725;
           $$sum25$i$i = $$sum$i19$i + 8 | 0;
           $915 = $tbase$245$i + $$sum25$i$i | 0;
           HEAP32[$915 >> 2] = $725;
           break L345;
          }
         }
        } while (0);
        $916 = $T$0$lcssa$i26$i + 8 | 0;
        $917 = HEAP32[$916 >> 2] | 0;
        $918 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
        $919 = $T$0$lcssa$i26$i >>> 0 >= $918 >>> 0;
        $920 = $917 >>> 0 >= $918 >>> 0;
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = $917 + 12 | 0;
         HEAP32[$921 >> 2] = $725;
         HEAP32[$916 >> 2] = $725;
         $$sum20$i$i = $$sum$i19$i + 8 | 0;
         $922 = $tbase$245$i + $$sum20$i$i | 0;
         HEAP32[$922 >> 2] = $917;
         $$sum21$i$i = $$sum$i19$i + 12 | 0;
         $923 = $tbase$245$i + $$sum21$i$i | 0;
         HEAP32[$923 >> 2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = $$sum$i19$i + 24 | 0;
         $924 = $tbase$245$i + $$sum22$i$i | 0;
         HEAP32[$924 >> 2] = 0;
         break;
        } else {
         _abort();
        }
       }
      } while (0);
      $$sum1819$i$i = $713 | 8;
      $925 = $tbase$245$i + $$sum1819$i$i | 0;
      $mem$0 = $925;
      return $mem$0 | 0;
     }
    }
    $sp$0$i$i$i = 147e3 + 448 | 0;
    while (1) {
     $926 = HEAP32[$sp$0$i$i$i >> 2] | 0;
     $927 = $926 >>> 0 > $636 >>> 0;
     if (!$927) {
      $928 = $sp$0$i$i$i + 4 | 0;
      $929 = HEAP32[$928 >> 2] | 0;
      $930 = $926 + $929 | 0;
      $931 = $930 >>> 0 > $636 >>> 0;
      if ($931) {
       $$lcssa116 = $926;
       $$lcssa117 = $929;
       $$lcssa118 = $930;
       break;
      }
     }
     $932 = $sp$0$i$i$i + 8 | 0;
     $933 = HEAP32[$932 >> 2] | 0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = $$lcssa117 + -47 | 0;
    $$sum1$i14$i = $$lcssa117 + -39 | 0;
    $934 = $$lcssa116 + $$sum1$i14$i | 0;
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936 | 0) == 0;
    if ($937) {
     $940 = 0;
    } else {
     $938 = 0 - $935 | 0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = $$sum$i13$i + $940 | 0;
    $941 = $$lcssa116 + $$sum2$i15$i | 0;
    $942 = $636 + 16 | 0;
    $943 = $941 >>> 0 < $942 >>> 0;
    $944 = $943 ? $636 : $941;
    $945 = $944 + 8 | 0;
    $946 = $tsize$244$i + -40 | 0;
    $947 = $tbase$245$i + 8 | 0;
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949 | 0) == 0;
    if ($950) {
     $954 = 0;
    } else {
     $951 = 0 - $948 | 0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = $tbase$245$i + $954 | 0;
    $955 = $946 - $954 | 0;
    HEAP32[(147e3 + 24 | 0) >> 2] = $953;
    HEAP32[(147e3 + 12 | 0) >> 2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = $954 + 4 | 0;
    $957 = $tbase$245$i + $$sum$i$i$i | 0;
    HEAP32[$957 >> 2] = $956;
    $$sum2$i$i$i = $tsize$244$i + -36 | 0;
    $958 = $tbase$245$i + $$sum2$i$i$i | 0;
    HEAP32[$958 >> 2] = 40;
    $959 = HEAP32[(147472 + 16 | 0) >> 2] | 0;
    HEAP32[(147e3 + 28 | 0) >> 2] = $959;
    $960 = $944 + 4 | 0;
    HEAP32[$960 >> 2] = 27;
    HEAP32[$945 + 0 >> 2] = HEAP32[(147e3 + 448 | 0) + 0 >> 2] | 0;
    HEAP32[$945 + 4 >> 2] = HEAP32[(147e3 + 448 | 0) + 4 >> 2] | 0;
    HEAP32[$945 + 8 >> 2] = HEAP32[(147e3 + 448 | 0) + 8 >> 2] | 0;
    HEAP32[$945 + 12 >> 2] = HEAP32[(147e3 + 448 | 0) + 12 >> 2] | 0;
    HEAP32[(147e3 + 448 | 0) >> 2] = $tbase$245$i;
    HEAP32[(147e3 + 452 | 0) >> 2] = $tsize$244$i;
    HEAP32[(147e3 + 460 | 0) >> 2] = 0;
    HEAP32[(147e3 + 456 | 0) >> 2] = $945;
    $961 = $944 + 28 | 0;
    HEAP32[$961 >> 2] = 7;
    $962 = $944 + 32 | 0;
    $963 = $962 >>> 0 < $$lcssa118 >>> 0;
    if ($963) {
     $965 = $961;
     while (1) {
      $964 = $965 + 4 | 0;
      HEAP32[$964 >> 2] = 7;
      $966 = $965 + 8 | 0;
      $967 = $966 >>> 0 < $$lcssa118 >>> 0;
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944 | 0) == ($636 | 0);
    if (!$968) {
     $969 = $944;
     $970 = $636;
     $971 = $969 - $970 | 0;
     $972 = $636 + $971 | 0;
     $$sum3$i$i = $971 + 4 | 0;
     $973 = $636 + $$sum3$i$i | 0;
     $974 = HEAP32[$973 >> 2] | 0;
     $975 = $974 & -2;
     HEAP32[$973 >> 2] = $975;
     $976 = $971 | 1;
     $977 = $636 + 4 | 0;
     HEAP32[$977 >> 2] = $976;
     HEAP32[$972 >> 2] = $971;
     $978 = $971 >>> 3;
     $979 = $971 >>> 0 < 256;
     if ($979) {
      $980 = $978 << 1;
      $981 = (147e3 + ($980 << 2) | 0) + 40 | 0;
      $982 = HEAP32[147e3 >> 2] | 0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984 | 0) == 0;
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[147e3 >> 2] = $986;
        $$sum10$pre$i$i = $980 + 2 | 0;
        $$pre$i$i = (147e3 + ($$sum10$pre$i$i << 2) | 0) + 40 | 0;
        $$pre$phi$i$iZ2D = $$pre$i$i;
        $F$0$i$i = $981;
       } else {
        $$sum11$i$i = $980 + 2 | 0;
        $987 = (147e3 + ($$sum11$i$i << 2) | 0) + 40 | 0;
        $988 = HEAP32[$987 >> 2] | 0;
        $989 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
        $990 = $988 >>> 0 < $989 >>> 0;
        if (!$990) {
         $$pre$phi$i$iZ2D = $987;
         $F$0$i$i = $988;
         break;
        }
        _abort();
       }
      } while (0);
      HEAP32[$$pre$phi$i$iZ2D >> 2] = $636;
      $991 = $F$0$i$i + 12 | 0;
      HEAP32[$991 >> 2] = $636;
      $992 = $636 + 8 | 0;
      HEAP32[$992 >> 2] = $F$0$i$i;
      $993 = $636 + 12 | 0;
      HEAP32[$993 >> 2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994 | 0) == 0;
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = $971 >>> 0 > 16777215;
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = $994 + 1048320 | 0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = $1000 + 520192 | 0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = $1005 + 245760 | 0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = 14 - $1009 | 0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = $1010 + $1012 | 0;
       $1014 = $1013 << 1;
       $1015 = $1013 + 7 | 0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = (147e3 + ($I1$0$i$i << 2) | 0) + 304 | 0;
     $1020 = $636 + 28 | 0;
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020 >> 2] = $I1$0$c$i$i;
     $1021 = $636 + 20 | 0;
     HEAP32[$1021 >> 2] = 0;
     $1022 = $636 + 16 | 0;
     HEAP32[$1022 >> 2] = 0;
     $1023 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025 | 0) == 0;
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[(147e3 + 4 | 0) >> 2] = $1027;
      HEAP32[$1019 >> 2] = $636;
      $1028 = $636 + 24 | 0;
      HEAP32[$1028 >> 2] = $1019;
      $1029 = $636 + 12 | 0;
      HEAP32[$1029 >> 2] = $636;
      $1030 = $636 + 8 | 0;
      HEAP32[$1030 >> 2] = $636;
      break;
     }
     $1031 = HEAP32[$1019 >> 2] | 0;
     $1032 = ($I1$0$i$i | 0) == 31;
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = 25 - $1033 | 0;
      $1040 = $1034;
     }
     $1035 = $1031 + 4 | 0;
     $1036 = HEAP32[$1035 >> 2] | 0;
     $1037 = $1036 & -8;
     $1038 = ($1037 | 0) == ($971 | 0);
     L493 : do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;
       $T$014$i$i = $1031;
       while (1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ($T$014$i$i + ($1047 << 2) | 0) + 16 | 0;
        $1043 = HEAP32[$1048 >> 2] | 0;
        $1049 = ($1043 | 0) == (0 | 0);
        if ($1049) {
         $$lcssa112 = $1048;
         $T$014$i$i$lcssa = $T$014$i$i;
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = $1043 + 4 | 0;
        $1044 = HEAP32[$1042 >> 2] | 0;
        $1045 = $1044 & -8;
        $1046 = ($1045 | 0) == ($971 | 0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L493;
        } else {
         $K2$015$i$i = $1041;
         $T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
       $1051 = $$lcssa112 >>> 0 < $1050 >>> 0;
       if ($1051) {
        _abort();
       } else {
        HEAP32[$$lcssa112 >> 2] = $636;
        $1052 = $636 + 24 | 0;
        HEAP32[$1052 >> 2] = $T$014$i$i$lcssa;
        $1053 = $636 + 12 | 0;
        HEAP32[$1053 >> 2] = $636;
        $1054 = $636 + 8 | 0;
        HEAP32[$1054 >> 2] = $636;
        break L308;
       }
      }
     } while (0);
     $1055 = $T$0$lcssa$i$i + 8 | 0;
     $1056 = HEAP32[$1055 >> 2] | 0;
     $1057 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $1058 = $T$0$lcssa$i$i >>> 0 >= $1057 >>> 0;
     $1059 = $1056 >>> 0 >= $1057 >>> 0;
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = $1056 + 12 | 0;
      HEAP32[$1060 >> 2] = $636;
      HEAP32[$1055 >> 2] = $636;
      $1061 = $636 + 8 | 0;
      HEAP32[$1061 >> 2] = $1056;
      $1062 = $636 + 12 | 0;
      HEAP32[$1062 >> 2] = $T$0$lcssa$i$i;
      $1063 = $636 + 24 | 0;
      HEAP32[$1063 >> 2] = 0;
      break;
     } else {
      _abort();
     }
    }
   }
  } while (0);
  $1064 = HEAP32[(147e3 + 12 | 0) >> 2] | 0;
  $1065 = $1064 >>> 0 > $nb$0 >>> 0;
  if ($1065) {
   $1066 = $1064 - $nb$0 | 0;
   HEAP32[(147e3 + 12 | 0) >> 2] = $1066;
   $1067 = HEAP32[(147e3 + 24 | 0) >> 2] | 0;
   $1068 = $1067 + $nb$0 | 0;
   HEAP32[(147e3 + 24 | 0) >> 2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = $nb$0 + 4 | 0;
   $1070 = $1067 + $$sum$i32 | 0;
   HEAP32[$1070 >> 2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = $1067 + 4 | 0;
   HEAP32[$1072 >> 2] = $1071;
   $1073 = $1067 + 8 | 0;
   $mem$0 = $1073;
   return $mem$0 | 0;
  }
 }
 $1074 = ___errno_location() | 0;
 HEAP32[$1074 >> 2] = 12;
 $mem$0 = 0;
 return $mem$0 | 0;
}
function emterpret(pc) {
 pc = pc | 0;
 var sp = 0, inst = 0, lx = 0, ly = 0, lz = 0;
 sp = EMTSTACKTOP;
 lx = HEAPU16[pc + 2 >> 1] | 0;
 EMTSTACKTOP = EMTSTACKTOP + (lx << 3) | 0;
 pc = pc + 4 | 0;
 while (1) {
  pc = pc + 4 | 0;
  inst = HEAP32[pc >> 2] | 0;
  lx = inst >> 8 & 255;
  ly = inst >> 16 & 255;
  lz = inst >>> 24;
  switch (inst & 255) {
  case 0:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] | 0;
   break;
  case 1:
   HEAP32[sp + (lx << 3) >> 2] = inst >> 16;
   break;
  case 2:
   pc = pc + 4 | 0;
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[pc >> 2] | 0;
   break;
  case 3:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) + (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 4:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) - (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 5:
   HEAP32[sp + (lx << 3) >> 2] = Math_imul(HEAP32[sp + (ly << 3) >> 2] | 0, HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 6:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) / (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 7:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] >>> 0) / (HEAP32[sp + (lz << 3) >> 2] >>> 0) >>> 0;
   break;
  case 8:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) % (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 9:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] >>> 0) % (HEAP32[sp + (lz << 3) >> 2] >>> 0) >>> 0;
   break;
  case 12:
   HEAP32[sp + (lx << 3) >> 2] = !(HEAP32[sp + (ly << 3) >> 2] | 0);
   break;
  case 13:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) == (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 14:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) != (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 15:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) < (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 16:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] >>> 0 < HEAP32[sp + (lz << 3) >> 2] >>> 0 | 0;
   break;
  case 17:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) <= (HEAP32[sp + (lz << 3) >> 2] | 0) | 0;
   break;
  case 18:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] >>> 0 <= HEAP32[sp + (lz << 3) >> 2] >>> 0 | 0;
   break;
  case 19:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) & (HEAP32[sp + (lz << 3) >> 2] | 0);
   break;
  case 20:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] | 0 | (HEAP32[sp + (lz << 3) >> 2] | 0);
   break;
  case 21:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) ^ (HEAP32[sp + (lz << 3) >> 2] | 0);
   break;
  case 22:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) << (HEAP32[sp + (lz << 3) >> 2] | 0);
   break;
  case 23:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) >> (HEAP32[sp + (lz << 3) >> 2] | 0);
   break;
  case 24:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) >>> (HEAP32[sp + (lz << 3) >> 2] | 0);
   break;
  case 25:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) + (inst >> 24) | 0;
   break;
  case 26:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) - (inst >> 24) | 0;
   break;
  case 27:
   HEAP32[sp + (lx << 3) >> 2] = Math_imul(HEAP32[sp + (ly << 3) >> 2] | 0, inst >> 24) | 0;
   break;
  case 28:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) / (inst >> 24) | 0;
   break;
  case 29:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] >>> 0) / (lz >>> 0) >>> 0;
   break;
  case 30:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) % (inst >> 24) | 0;
   break;
  case 31:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] >>> 0) % (lz >>> 0) >>> 0;
   break;
  case 32:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) == inst >> 24 | 0;
   break;
  case 33:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) != inst >> 24 | 0;
   break;
  case 34:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) < inst >> 24 | 0;
   break;
  case 35:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] >>> 0 < lz >>> 0 | 0;
   break;
  case 37:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] >>> 0 <= lz >>> 0 | 0;
   break;
  case 38:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) & inst >> 24;
   break;
  case 39:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] | 0 | inst >> 24;
   break;
  case 40:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) ^ inst >> 24;
   break;
  case 41:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) << lz;
   break;
  case 42:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) >> lz;
   break;
  case 43:
   HEAP32[sp + (lx << 3) >> 2] = (HEAP32[sp + (ly << 3) >> 2] | 0) >>> lz;
   break;
  case 45:
   if ((HEAP32[sp + (ly << 3) >> 2] | 0) == (HEAP32[sp + (lz << 3) >> 2] | 0)) {
    pc = pc + 4 | 0;
   } else {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 46:
   if ((HEAP32[sp + (ly << 3) >> 2] | 0) != (HEAP32[sp + (lz << 3) >> 2] | 0)) {
    pc = pc + 4 | 0;
   } else {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 47:
   if ((HEAP32[sp + (ly << 3) >> 2] | 0) < (HEAP32[sp + (lz << 3) >> 2] | 0)) {
    pc = pc + 4 | 0;
   } else {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 48:
   if (HEAP32[sp + (ly << 3) >> 2] >>> 0 < HEAP32[sp + (lz << 3) >> 2] >>> 0) {
    pc = pc + 4 | 0;
   } else {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 50:
   if (HEAP32[sp + (ly << 3) >> 2] >>> 0 <= HEAP32[sp + (lz << 3) >> 2] >>> 0) {
    pc = pc + 4 | 0;
   } else {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 52:
   if ((HEAP32[sp + (ly << 3) >> 2] | 0) == (HEAP32[sp + (lz << 3) >> 2] | 0)) {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   } else {
    pc = pc + 4 | 0;
   }
   break;
  case 53:
   if ((HEAP32[sp + (ly << 3) >> 2] | 0) != (HEAP32[sp + (lz << 3) >> 2] | 0)) {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   } else {
    pc = pc + 4 | 0;
   }
   break;
  case 54:
   if ((HEAP32[sp + (ly << 3) >> 2] | 0) < (HEAP32[sp + (lz << 3) >> 2] | 0)) {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   } else {
    pc = pc + 4 | 0;
   }
   break;
  case 55:
   if (HEAP32[sp + (ly << 3) >> 2] >>> 0 < HEAP32[sp + (lz << 3) >> 2] >>> 0) {
    pc = HEAP32[pc + 4 >> 2] | 0;
    pc = pc - 4 | 0;
    continue;
   } else {
    pc = pc + 4 | 0;
   }
   break;
  case 58:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[sp + (ly << 3) >> 3];
   break;
  case 59:
   HEAPF64[sp + (lx << 3) >> 3] = +(inst >> 16);
   break;
  case 60:
   pc = pc + 4 | 0;
   HEAPF64[sp + (lx << 3) >> 3] = +(HEAP32[pc >> 2] | 0);
   break;
  case 61:
   pc = pc + 4 | 0;
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF32[pc >> 2];
   break;
  case 62:
   HEAP32[tempDoublePtr >> 2] = HEAP32[pc + 4 >> 2];
   HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[pc + 8 >> 2];
   pc = pc + 8 | 0;
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[tempDoublePtr >> 3];
   break;
  case 63:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[sp + (ly << 3) >> 3] + +HEAPF64[sp + (lz << 3) >> 3];
   break;
  case 64:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[sp + (ly << 3) >> 3] - +HEAPF64[sp + (lz << 3) >> 3];
   break;
  case 65:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[sp + (ly << 3) >> 3] * +HEAPF64[sp + (lz << 3) >> 3];
   break;
  case 66:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[sp + (ly << 3) >> 3] / +HEAPF64[sp + (lz << 3) >> 3];
   break;
  case 68:
   HEAPF64[sp + (lx << 3) >> 3] = -+HEAPF64[sp + (ly << 3) >> 3];
   break;
  case 69:
   HEAP32[sp + (lx << 3) >> 2] = +HEAPF64[sp + (ly << 3) >> 3] == +HEAPF64[sp + (lz << 3) >> 3] | 0;
   break;
  case 70:
   HEAP32[sp + (lx << 3) >> 2] = +HEAPF64[sp + (ly << 3) >> 3] != +HEAPF64[sp + (lz << 3) >> 3] | 0;
   break;
  case 71:
   HEAP32[sp + (lx << 3) >> 2] = +HEAPF64[sp + (ly << 3) >> 3] < +HEAPF64[sp + (lz << 3) >> 3] | 0;
   break;
  case 72:
   HEAP32[sp + (lx << 3) >> 2] = +HEAPF64[sp + (ly << 3) >> 3] <= +HEAPF64[sp + (lz << 3) >> 3] | 0;
   break;
  case 73:
   HEAP32[sp + (lx << 3) >> 2] = +HEAPF64[sp + (ly << 3) >> 3] > +HEAPF64[sp + (lz << 3) >> 3] | 0;
   break;
  case 74:
   HEAP32[sp + (lx << 3) >> 2] = +HEAPF64[sp + (ly << 3) >> 3] >= +HEAPF64[sp + (lz << 3) >> 3] | 0;
   break;
  case 75:
   HEAP32[sp + (lx << 3) >> 2] = ~~+HEAPF64[sp + (ly << 3) >> 3];
   break;
  case 76:
   HEAPF64[sp + (lx << 3) >> 3] = +(HEAP32[sp + (ly << 3) >> 2] | 0);
   break;
  case 77:
   HEAPF64[sp + (lx << 3) >> 3] = +(HEAP32[sp + (ly << 3) >> 2] >>> 0);
   break;
  case 78:
   HEAP32[sp + (lx << 3) >> 2] = HEAP8[HEAP32[sp + (ly << 3) >> 2] >> 0];
   break;
  case 79:
   HEAP32[sp + (lx << 3) >> 2] = HEAPU8[HEAP32[sp + (ly << 3) >> 2] >> 0];
   break;
  case 80:
   HEAP32[sp + (lx << 3) >> 2] = HEAP16[HEAP32[sp + (ly << 3) >> 2] >> 1];
   break;
  case 82:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[HEAP32[sp + (ly << 3) >> 2] >> 2];
   break;
  case 83:
   HEAP8[HEAP32[sp + (lx << 3) >> 2] >> 0] = HEAP32[sp + (ly << 3) >> 2] | 0;
   break;
  case 84:
   HEAP16[HEAP32[sp + (lx << 3) >> 2] >> 1] = HEAP32[sp + (ly << 3) >> 2] | 0;
   break;
  case 85:
   HEAP32[HEAP32[sp + (lx << 3) >> 2] >> 2] = HEAP32[sp + (ly << 3) >> 2] | 0;
   break;
  case 86:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[HEAP32[sp + (ly << 3) >> 2] >> 3];
   break;
  case 87:
   HEAPF64[HEAP32[sp + (lx << 3) >> 2] >> 3] = +HEAPF64[sp + (ly << 3) >> 3];
   break;
  case 88:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF32[HEAP32[sp + (ly << 3) >> 2] >> 2];
   break;
  case 89:
   HEAPF32[HEAP32[sp + (lx << 3) >> 2] >> 2] = +HEAPF64[sp + (ly << 3) >> 3];
   break;
  case 90:
   HEAP32[sp + (lx << 3) >> 2] = HEAP8[(HEAP32[sp + (ly << 3) >> 2] | 0) + (HEAP32[sp + (lz << 3) >> 2] | 0) >> 0];
   break;
  case 92:
   HEAP32[sp + (lx << 3) >> 2] = HEAP16[(HEAP32[sp + (ly << 3) >> 2] | 0) + (HEAP32[sp + (lz << 3) >> 2] | 0) >> 1];
   break;
  case 94:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[(HEAP32[sp + (ly << 3) >> 2] | 0) + (HEAP32[sp + (lz << 3) >> 2] | 0) >> 2];
   break;
  case 95:
   HEAP8[(HEAP32[sp + (lx << 3) >> 2] | 0) + (HEAP32[sp + (ly << 3) >> 2] | 0) >> 0] = HEAP32[sp + (lz << 3) >> 2] | 0;
   break;
  case 97:
   HEAP32[(HEAP32[sp + (lx << 3) >> 2] | 0) + (HEAP32[sp + (ly << 3) >> 2] | 0) >> 2] = HEAP32[sp + (lz << 3) >> 2] | 0;
   break;
  case 100:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF32[(HEAP32[sp + (ly << 3) >> 2] | 0) + (HEAP32[sp + (lz << 3) >> 2] | 0) >> 2];
   break;
  case 101:
   HEAPF32[(HEAP32[sp + (lx << 3) >> 2] | 0) + (HEAP32[sp + (ly << 3) >> 2] | 0) >> 2] = +HEAPF64[sp + (lz << 3) >> 3];
   break;
  case 102:
   HEAP32[sp + (lx << 3) >> 2] = HEAP8[(HEAP32[sp + (ly << 3) >> 2] | 0) + (inst >> 24) >> 0];
   break;
  case 103:
   HEAP32[sp + (lx << 3) >> 2] = HEAPU8[(HEAP32[sp + (ly << 3) >> 2] | 0) + (inst >> 24) >> 0];
   break;
  case 104:
   HEAP32[sp + (lx << 3) >> 2] = HEAP16[(HEAP32[sp + (ly << 3) >> 2] | 0) + (inst >> 24) >> 1];
   break;
  case 106:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[(HEAP32[sp + (ly << 3) >> 2] | 0) + (inst >> 24) >> 2];
   break;
  case 107:
   HEAP8[(HEAP32[sp + (lx << 3) >> 2] | 0) + (ly << 24 >> 24) >> 0] = HEAP32[sp + (lz << 3) >> 2] | 0;
   break;
  case 108:
   HEAP16[(HEAP32[sp + (lx << 3) >> 2] | 0) + (ly << 24 >> 24) >> 1] = HEAP32[sp + (lz << 3) >> 2] | 0;
   break;
  case 109:
   HEAP32[(HEAP32[sp + (lx << 3) >> 2] | 0) + (ly << 24 >> 24) >> 2] = HEAP32[sp + (lz << 3) >> 2] | 0;
   break;
  case 112:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF32[(HEAP32[sp + (ly << 3) >> 2] | 0) + (inst >> 24) >> 2];
   break;
  case 113:
   HEAPF32[(HEAP32[sp + (lx << 3) >> 2] | 0) + (ly << 24 >> 24) >> 2] = +HEAPF64[sp + (lz << 3) >> 3];
   break;
  case 116:
   HEAP32[HEAP32[sp + (lx << 3) >> 2] >> 2] = HEAP32[HEAP32[sp + (ly << 3) >> 2] >> 2] | 0;
   break;
  case 119:
   pc = pc + (inst >> 16 << 2) | 0;
   pc = pc - 4 | 0;
   continue;
   break;
  case 120:
   if (HEAP32[sp + (lx << 3) >> 2] | 0) {
    pc = pc + (inst >> 16 << 2) | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 121:
   if (!(HEAP32[sp + (lx << 3) >> 2] | 0)) {
    pc = pc + (inst >> 16 << 2) | 0;
    pc = pc - 4 | 0;
    continue;
   }
   break;
  case 122:
   pc = HEAP32[pc + 4 >> 2] | 0;
   pc = pc - 4 | 0;
   continue;
   break;
  case 125:
   pc = pc + 4 | 0;
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (ly << 3) >> 2] | 0 ? HEAP32[sp + (lz << 3) >> 2] | 0 : HEAP32[sp + ((HEAPU8[pc >> 0] | 0) << 3) >> 2] | 0;
   break;
  case 126:
   pc = pc + 4 | 0;
   HEAPF64[sp + (lx << 3) >> 3] = HEAP32[sp + (ly << 3) >> 2] | 0 ? +HEAPF64[sp + (lz << 3) >> 3] : +HEAPF64[sp + ((HEAPU8[pc >> 0] | 0) << 3) >> 3];
   break;
  case 127:
   HEAP32[sp + (lx << 3) >> 2] = tempDoublePtr;
   break;
  case 128:
   HEAP32[sp + (lx << 3) >> 2] = tempRet0;
   break;
  case 129:
   tempRet0 = HEAP32[sp + (lx << 3) >> 2] | 0;
   break;
  case 130:
   switch (ly | 0) {
   case 0:
    {
     HEAP32[sp + (lx << 3) >> 2] = _stdin;
     continue;
    }
   case 1:
    {
     HEAP32[sp + (lx << 3) >> 2] = _stdout;
     continue;
    }
   case 2:
    {
     HEAP32[sp + (lx << 3) >> 2] = _stderr;
     continue;
    }
   case 3:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___dso_handle;
     continue;
    }
   case 4:
    {
     HEAP32[sp + (lx << 3) >> 2] = cttz_i8;
     continue;
    }
   default:
   }
   break;
  case 134:
   lz = HEAPU8[(HEAP32[pc + 4 >> 2] | 0) + 1 | 0] | 0;
   ly = 0;
   while ((ly | 0) < (lz | 0)) {
    HEAP32[EMTSTACKTOP + (ly << 3) + 0 >> 2] = HEAP32[sp + (HEAPU8[pc + 8 + ly >> 0] << 3) >> 2] | 0;
    HEAP32[EMTSTACKTOP + (ly << 3) + 4 >> 2] = HEAP32[sp + (HEAPU8[pc + 8 + ly >> 0] << 3) + 4 >> 2] | 0;
    ly = ly + 1 | 0;
   }
   emterpret(HEAP32[pc + 4 >> 2] | 0);
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[EMTSTACKTOP >> 2] | 0;
   HEAP32[sp + (lx << 3) + 4 >> 2] = HEAP32[EMTSTACKTOP + 4 >> 2] | 0;
   pc = pc + (4 + lz + 3 >> 2 << 2) | 0;
   break;
  case 135:
   switch (inst >>> 16 | 0) {
   case 0:
    {
     HEAP32[sp + (lx << 3) >> 2] = _malloc(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 1:
    {
     HEAP32[sp + (lx << 3) >> 2] = _memcpy(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 2:
    {
     _free(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 3:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_iii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 511](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 4:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_abs(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 5:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_sqrt(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 6:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_exp(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 7:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_log(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 8:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_ceil(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 9:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_floor(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 10:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_sin(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 11:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_cos(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 12:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +Math_pow(+HEAPF64[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 3], +HEAPF64[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 3]);
     pc = pc + 4 | 0;
     continue;
    }
   case 13:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___errno_location() | 0;
     continue;
    }
   case 14:
    {
     HEAP32[sp + (lx << 3) >> 2] = _memset(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 15:
    {
     HEAP32[sp + (lx << 3) >> 2] = _bitshift64Shl(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 16:
    {
     HEAP32[sp + (lx << 3) >> 2] = _strerror(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 17:
    {
     HEAP32[sp + (lx << 3) >> 2] = _bitshift64Lshr(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 18:
    {
     HEAP32[sp + (lx << 3) >> 2] = _fwrite(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 19:
    {
     HEAP32[sp + (lx << 3) >> 2] = _fprintf(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 20:
    {
     HEAP32[sp + (lx << 3) >> 2] = _fputc(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 21:
    {
     HEAP32[sp + (lx << 3) >> 2] = _strlen(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 22:
    {
     HEAP32[sp + (lx << 3) >> 2] = _bitshift64Ashr(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 23:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_ii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 255](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 24:
    {
     FUNCTION_TABLE_vi[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 255](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 25:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_iiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 127](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 26:
    {
     _abort();
     continue;
    }
   case 27:
    {
     FUNCTION_TABLE_viiiiiiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 3](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 9 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 10 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 11 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 12 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 13 >> 0] << 3) >> 2] | 0);
     pc = pc + 12 | 0;
     continue;
    }
   case 28:
    {
     FUNCTION_TABLE_vii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 255](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 29:
    {
     FUNCTION_TABLE_viiiiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 63](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 9 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 10 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 11 >> 0] << 3) >> 2] | 0);
     pc = pc + 8 | 0;
     continue;
    }
   case 30:
    {
     HEAP32[sp + (lx << 3) >> 2] = _fread(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 31:
    {
     HEAP32[sp + (lx << 3) >> 2] = _ferror(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 32:
    {
     _clearerr(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 33:
    {
     HEAP32[sp + (lx << 3) >> 2] = _getc(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 34:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_iiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 7](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 8 | 0;
     continue;
    }
   case 35:
    {
     HEAP32[sp + (lx << 3) >> 2] = Math_clz32(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 36:
    {
     HEAP32[sp + (lx << 3) >> 2] = _printf(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 37:
    {
     HEAP32[sp + (lx << 3) >> 2] = _uselocale(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 38:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_iiiiiiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 15](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 9 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 10 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 11 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 12 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 12 | 0;
     continue;
    }
   case 39:
    {
     HEAP32[sp + (lx << 3) >> 2] = _catgets(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 40:
    {
     FUNCTION_TABLE_viiiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 31](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 9 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 10 >> 0] << 3) >> 2] | 0);
     pc = pc + 8 | 0;
     continue;
    }
   case 41:
    {
     HEAP32[sp + (lx << 3) >> 2] = _ungetc(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 42:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___cxa_guard_acquire(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 43:
    {
     ___cxa_guard_release(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 44:
    {
     FUNCTION_TABLE_viii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 15](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 45:
    {
     FUNCTION_TABLE_viiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 3](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 9 >> 0] << 3) >> 2] | 0);
     pc = pc + 8 | 0;
     continue;
    }
   case 46:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___cxa_atexit(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 47:
    {
     ___assert_fail(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 48:
    {
     HEAP32[sp + (lx << 3) >> 2] = _puts(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 49:
    {
     HEAP32[sp + (lx << 3) >> 2] = _memmove(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 50:
    {
     HEAP32[sp + (lx << 3) >> 2] = __ZSt18uncaught_exceptionv() | 0;
     continue;
    }
   case 51:
    {
     FUNCTION_TABLE_viiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 15](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0);
     pc = pc + 8 | 0;
     continue;
    }
   case 52:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_iiiiii[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 15](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 9 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 8 | 0;
     continue;
    }
   case 53:
    {
     HEAP32[sp + (lx << 3) >> 2] = _fflush(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 54:
    {
     HEAP32[sp + (lx << 3) >> 2] = _putchar(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 55:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___cxa_allocate_exception(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 56:
    {
     ___cxa_throw(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 57:
    {
     HEAP32[sp + (lx << 3) >> 2] = _strftime_l(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 8 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 8 | 0;
     continue;
    }
   case 58:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_mutex_lock(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 59:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_cond_wait(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 60:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_mutex_unlock(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 61:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_cond_broadcast(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 62:
    {
     FUNCTION_TABLE_v[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 7]();
     pc = pc + 4 | 0;
     continue;
    }
   case 63:
    {
     HEAPF64[sp + (lx << 3) >> 3] = +FUNCTION_TABLE_di[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 7](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 64:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_id[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 7](+HEAPF64[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 3]) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 65:
    {
     HEAP32[sp + (lx << 3) >> 2] = _catopen(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 66:
    {
     HEAP32[sp + (lx << 3) >> 2] = _newlocale(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 67:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_once(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 68:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_getspecific(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 69:
    {
     ___cxa_rethrow();
     continue;
    }
   case 70:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_setspecific(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 71:
    {
     _freelocale(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 72:
    {
     HEAP32[sp + (lx << 3) >> 2] = FUNCTION_TABLE_iidi[HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] & 1](HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, +HEAPF64[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 3], HEAP32[sp + (HEAPU8[pc + 7 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 73:
    {
     HEAP32[sp + (lx << 3) >> 2] = _pthread_key_create(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 74:
    {
     HEAP32[sp + (lx << 3) >> 2] = _vfprintf(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 5 >> 0] << 3) >> 2] | 0, HEAP32[sp + (HEAPU8[pc + 6 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 75:
    {
     _exit(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 76:
    {
     HEAP32[sp + (lx << 3) >> 2] = _atexit(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 77:
    {
     HEAP32[sp + (lx << 3) >> 2] = _catclose(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 78:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___ctype_toupper_loc() | 0;
     continue;
    }
   case 79:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___ctype_tolower_loc() | 0;
     continue;
    }
   case 80:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___ctype_b_loc() | 0;
     continue;
    }
   case 81:
    {
     abort(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0);
     pc = pc + 4 | 0;
     continue;
    }
   case 82:
    {
     HEAP32[sp + (lx << 3) >> 2] = ___cxa_begin_catch(HEAP32[sp + (HEAPU8[pc + 4 >> 0] << 3) >> 2] | 0) | 0;
     pc = pc + 4 | 0;
     continue;
    }
   case 83:
    {
     ___cxa_pure_virtual();
     continue;
    }
   default:
   }
   break;
  case 136:
   HEAP32[sp + (lx << 3) >> 2] = STACKTOP;
   break;
  case 137:
   STACKTOP = HEAP32[sp + (lx << 3) >> 2] | 0;
   break;
  case 138:
   lz = HEAP32[sp + (lz << 3) >> 2] | 0;
   lx = (HEAP32[sp + (lx << 3) >> 2] | 0) - (HEAP32[sp + (ly << 3) >> 2] | 0) >>> 0;
   if (lx >>> 0 >= lz >>> 0) {
    pc = pc + (lz << 2) | 0;
    continue;
   }
   pc = HEAP32[pc + 4 + (lx << 2) >> 2] | 0;
   pc = pc - 4 | 0;
   continue;
   break;
  case 139:
   EMTSTACKTOP = sp;
   HEAP32[EMTSTACKTOP >> 2] = HEAP32[sp + (lx << 3) >> 2] | 0;
   HEAP32[EMTSTACKTOP + 4 >> 2] = HEAP32[sp + (lx << 3) + 4 >> 2] | 0;
   return;
   break;
  case 141:
   HEAP32[sp + (lx << 3) >> 2] = HEAP32[sp + (inst >>> 16 << 3) >> 2] | 0;
   break;
  case 142:
   HEAPF64[sp + (lx << 3) >> 3] = +HEAPF64[sp + (inst >>> 16 << 3) >> 3];
   break;
  case 143:
   HEAP32[sp + (inst >>> 16 << 3) >> 2] = HEAP32[sp + (lx << 3) >> 2] | 0;
   break;
  case 144:
   HEAPF64[sp + (inst >>> 16 << 3) >> 3] = +HEAPF64[sp + (lx << 3) >> 3];
   break;
  default:
  }
 }
}

function _free($mem) {
 $mem = $mem | 0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$060 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0, $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$059 = 0, $T$059$lcssa = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 label = 0;
 sp = STACKTOP;
 $0 = ($mem | 0) == (0 | 0);
 if ($0) {
  return;
 }
 $1 = $mem + -8 | 0;
 $2 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
 $3 = $1 >>> 0 < $2 >>> 0;
 if ($3) {
  _abort();
 }
 $4 = $mem + -4 | 0;
 $5 = HEAP32[$4 >> 2] | 0;
 $6 = $5 & 3;
 $7 = ($6 | 0) == 1;
 if ($7) {
  _abort();
 }
 $8 = $5 & -8;
 $$sum = $8 + -8 | 0;
 $9 = $mem + $$sum | 0;
 $10 = $5 & 1;
 $11 = ($10 | 0) == 0;
 do {
  if ($11) {
   $12 = HEAP32[$1 >> 2] | 0;
   $13 = ($6 | 0) == 0;
   if ($13) {
    return;
   }
   $$sum2 = -8 - $12 | 0;
   $14 = $mem + $$sum2 | 0;
   $15 = $12 + $8 | 0;
   $16 = $14 >>> 0 < $2 >>> 0;
   if ($16) {
    _abort();
   }
   $17 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
   $18 = ($14 | 0) == ($17 | 0);
   if ($18) {
    $$sum3 = $8 + -4 | 0;
    $103 = $mem + $$sum3 | 0;
    $104 = HEAP32[$103 >> 2] | 0;
    $105 = $104 & 3;
    $106 = ($105 | 0) == 3;
    if (!$106) {
     $p$0 = $14;
     $psize$0 = $15;
     break;
    }
    HEAP32[(147e3 + 8 | 0) >> 2] = $15;
    $107 = $104 & -2;
    HEAP32[$103 >> 2] = $107;
    $108 = $15 | 1;
    $$sum26 = $$sum2 + 4 | 0;
    $109 = $mem + $$sum26 | 0;
    HEAP32[$109 >> 2] = $108;
    HEAP32[$9 >> 2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = $12 >>> 0 < 256;
   if ($20) {
    $$sum36 = $$sum2 + 8 | 0;
    $21 = $mem + $$sum36 | 0;
    $22 = HEAP32[$21 >> 2] | 0;
    $$sum37 = $$sum2 + 12 | 0;
    $23 = $mem + $$sum37 | 0;
    $24 = HEAP32[$23 >> 2] | 0;
    $25 = $19 << 1;
    $26 = (147e3 + ($25 << 2) | 0) + 40 | 0;
    $27 = ($22 | 0) == ($26 | 0);
    if (!$27) {
     $28 = $22 >>> 0 < $2 >>> 0;
     if ($28) {
      _abort();
     }
     $29 = $22 + 12 | 0;
     $30 = HEAP32[$29 >> 2] | 0;
     $31 = ($30 | 0) == ($14 | 0);
     if (!$31) {
      _abort();
     }
    }
    $32 = ($24 | 0) == ($22 | 0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[147e3 >> 2] | 0;
     $36 = $35 & $34;
     HEAP32[147e3 >> 2] = $36;
     $p$0 = $14;
     $psize$0 = $15;
     break;
    }
    $37 = ($24 | 0) == ($26 | 0);
    if ($37) {
     $$pre67 = $24 + 8 | 0;
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = $24 >>> 0 < $2 >>> 0;
     if ($38) {
      _abort();
     }
     $39 = $24 + 8 | 0;
     $40 = HEAP32[$39 >> 2] | 0;
     $41 = ($40 | 0) == ($14 | 0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
     }
    }
    $42 = $22 + 12 | 0;
    HEAP32[$42 >> 2] = $24;
    HEAP32[$$pre$phi68Z2D >> 2] = $22;
    $p$0 = $14;
    $psize$0 = $15;
    break;
   }
   $$sum28 = $$sum2 + 24 | 0;
   $43 = $mem + $$sum28 | 0;
   $44 = HEAP32[$43 >> 2] | 0;
   $$sum29 = $$sum2 + 12 | 0;
   $45 = $mem + $$sum29 | 0;
   $46 = HEAP32[$45 >> 2] | 0;
   $47 = ($46 | 0) == ($14 | 0);
   do {
    if ($47) {
     $$sum31 = $$sum2 + 20 | 0;
     $57 = $mem + $$sum31 | 0;
     $58 = HEAP32[$57 >> 2] | 0;
     $59 = ($58 | 0) == (0 | 0);
     if ($59) {
      $$sum30 = $$sum2 + 16 | 0;
      $60 = $mem + $$sum30 | 0;
      $61 = HEAP32[$60 >> 2] | 0;
      $62 = ($61 | 0) == (0 | 0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;
       $RP$0 = $60;
      }
     } else {
      $R$0 = $58;
      $RP$0 = $57;
     }
     while (1) {
      $63 = $R$0 + 20 | 0;
      $64 = HEAP32[$63 >> 2] | 0;
      $65 = ($64 | 0) == (0 | 0);
      if (!$65) {
       $R$0 = $64;
       $RP$0 = $63;
       continue;
      }
      $66 = $R$0 + 16 | 0;
      $67 = HEAP32[$66 >> 2] | 0;
      $68 = ($67 | 0) == (0 | 0);
      if ($68) {
       $R$0$lcssa = $R$0;
       $RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;
       $RP$0 = $66;
      }
     }
     $69 = $RP$0$lcssa >>> 0 < $2 >>> 0;
     if ($69) {
      _abort();
     } else {
      HEAP32[$RP$0$lcssa >> 2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum35 = $$sum2 + 8 | 0;
     $48 = $mem + $$sum35 | 0;
     $49 = HEAP32[$48 >> 2] | 0;
     $50 = $49 >>> 0 < $2 >>> 0;
     if ($50) {
      _abort();
     }
     $51 = $49 + 12 | 0;
     $52 = HEAP32[$51 >> 2] | 0;
     $53 = ($52 | 0) == ($14 | 0);
     if (!$53) {
      _abort();
     }
     $54 = $46 + 8 | 0;
     $55 = HEAP32[$54 >> 2] | 0;
     $56 = ($55 | 0) == ($14 | 0);
     if ($56) {
      HEAP32[$51 >> 2] = $46;
      HEAP32[$54 >> 2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
     }
    }
   } while (0);
   $70 = ($44 | 0) == (0 | 0);
   if ($70) {
    $p$0 = $14;
    $psize$0 = $15;
   } else {
    $$sum32 = $$sum2 + 28 | 0;
    $71 = $mem + $$sum32 | 0;
    $72 = HEAP32[$71 >> 2] | 0;
    $73 = (147e3 + ($72 << 2) | 0) + 304 | 0;
    $74 = HEAP32[$73 >> 2] | 0;
    $75 = ($14 | 0) == ($74 | 0);
    if ($75) {
     HEAP32[$73 >> 2] = $R$1;
     $cond = ($R$1 | 0) == (0 | 0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
      $79 = $78 & $77;
      HEAP32[(147e3 + 4 | 0) >> 2] = $79;
      $p$0 = $14;
      $psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $81 = $44 >>> 0 < $80 >>> 0;
     if ($81) {
      _abort();
     }
     $82 = $44 + 16 | 0;
     $83 = HEAP32[$82 >> 2] | 0;
     $84 = ($83 | 0) == ($14 | 0);
     if ($84) {
      HEAP32[$82 >> 2] = $R$1;
     } else {
      $85 = $44 + 20 | 0;
      HEAP32[$85 >> 2] = $R$1;
     }
     $86 = ($R$1 | 0) == (0 | 0);
     if ($86) {
      $p$0 = $14;
      $psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
    $88 = $R$1 >>> 0 < $87 >>> 0;
    if ($88) {
     _abort();
    }
    $89 = $R$1 + 24 | 0;
    HEAP32[$89 >> 2] = $44;
    $$sum33 = $$sum2 + 16 | 0;
    $90 = $mem + $$sum33 | 0;
    $91 = HEAP32[$90 >> 2] | 0;
    $92 = ($91 | 0) == (0 | 0);
    do {
     if (!$92) {
      $93 = $91 >>> 0 < $87 >>> 0;
      if ($93) {
       _abort();
      } else {
       $94 = $R$1 + 16 | 0;
       HEAP32[$94 >> 2] = $91;
       $95 = $91 + 24 | 0;
       HEAP32[$95 >> 2] = $R$1;
       break;
      }
     }
    } while (0);
    $$sum34 = $$sum2 + 20 | 0;
    $96 = $mem + $$sum34 | 0;
    $97 = HEAP32[$96 >> 2] | 0;
    $98 = ($97 | 0) == (0 | 0);
    if ($98) {
     $p$0 = $14;
     $psize$0 = $15;
    } else {
     $99 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $100 = $97 >>> 0 < $99 >>> 0;
     if ($100) {
      _abort();
     } else {
      $101 = $R$1 + 20 | 0;
      HEAP32[$101 >> 2] = $97;
      $102 = $97 + 24 | 0;
      HEAP32[$102 >> 2] = $R$1;
      $p$0 = $14;
      $psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;
   $psize$0 = $8;
  }
 } while (0);
 $110 = $p$0 >>> 0 < $9 >>> 0;
 if (!$110) {
  _abort();
 }
 $$sum25 = $8 + -4 | 0;
 $111 = $mem + $$sum25 | 0;
 $112 = HEAP32[$111 >> 2] | 0;
 $113 = $112 & 1;
 $114 = ($113 | 0) == 0;
 if ($114) {
  _abort();
 }
 $115 = $112 & 2;
 $116 = ($115 | 0) == 0;
 if ($116) {
  $117 = HEAP32[(147e3 + 24 | 0) >> 2] | 0;
  $118 = ($9 | 0) == ($117 | 0);
  if ($118) {
   $119 = HEAP32[(147e3 + 12 | 0) >> 2] | 0;
   $120 = $119 + $psize$0 | 0;
   HEAP32[(147e3 + 12 | 0) >> 2] = $120;
   HEAP32[(147e3 + 24 | 0) >> 2] = $p$0;
   $121 = $120 | 1;
   $122 = $p$0 + 4 | 0;
   HEAP32[$122 >> 2] = $121;
   $123 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
   $124 = ($p$0 | 0) == ($123 | 0);
   if (!$124) {
    return;
   }
   HEAP32[(147e3 + 20 | 0) >> 2] = 0;
   HEAP32[(147e3 + 8 | 0) >> 2] = 0;
   return;
  }
  $125 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
  $126 = ($9 | 0) == ($125 | 0);
  if ($126) {
   $127 = HEAP32[(147e3 + 8 | 0) >> 2] | 0;
   $128 = $127 + $psize$0 | 0;
   HEAP32[(147e3 + 8 | 0) >> 2] = $128;
   HEAP32[(147e3 + 20 | 0) >> 2] = $p$0;
   $129 = $128 | 1;
   $130 = $p$0 + 4 | 0;
   HEAP32[$130 >> 2] = $129;
   $131 = $p$0 + $128 | 0;
   HEAP32[$131 >> 2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = $132 + $psize$0 | 0;
  $134 = $112 >>> 3;
  $135 = $112 >>> 0 < 256;
  do {
   if ($135) {
    $136 = $mem + $8 | 0;
    $137 = HEAP32[$136 >> 2] | 0;
    $$sum2324 = $8 | 4;
    $138 = $mem + $$sum2324 | 0;
    $139 = HEAP32[$138 >> 2] | 0;
    $140 = $134 << 1;
    $141 = (147e3 + ($140 << 2) | 0) + 40 | 0;
    $142 = ($137 | 0) == ($141 | 0);
    if (!$142) {
     $143 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $144 = $137 >>> 0 < $143 >>> 0;
     if ($144) {
      _abort();
     }
     $145 = $137 + 12 | 0;
     $146 = HEAP32[$145 >> 2] | 0;
     $147 = ($146 | 0) == ($9 | 0);
     if (!$147) {
      _abort();
     }
    }
    $148 = ($139 | 0) == ($137 | 0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[147e3 >> 2] | 0;
     $152 = $151 & $150;
     HEAP32[147e3 >> 2] = $152;
     break;
    }
    $153 = ($139 | 0) == ($141 | 0);
    if ($153) {
     $$pre65 = $139 + 8 | 0;
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $155 = $139 >>> 0 < $154 >>> 0;
     if ($155) {
      _abort();
     }
     $156 = $139 + 8 | 0;
     $157 = HEAP32[$156 >> 2] | 0;
     $158 = ($157 | 0) == ($9 | 0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
     }
    }
    $159 = $137 + 12 | 0;
    HEAP32[$159 >> 2] = $139;
    HEAP32[$$pre$phi66Z2D >> 2] = $137;
   } else {
    $$sum5 = $8 + 16 | 0;
    $160 = $mem + $$sum5 | 0;
    $161 = HEAP32[$160 >> 2] | 0;
    $$sum67 = $8 | 4;
    $162 = $mem + $$sum67 | 0;
    $163 = HEAP32[$162 >> 2] | 0;
    $164 = ($163 | 0) == ($9 | 0);
    do {
     if ($164) {
      $$sum9 = $8 + 12 | 0;
      $175 = $mem + $$sum9 | 0;
      $176 = HEAP32[$175 >> 2] | 0;
      $177 = ($176 | 0) == (0 | 0);
      if ($177) {
       $$sum8 = $8 + 8 | 0;
       $178 = $mem + $$sum8 | 0;
       $179 = HEAP32[$178 >> 2] | 0;
       $180 = ($179 | 0) == (0 | 0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;
        $RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;
       $RP9$0 = $175;
      }
      while (1) {
       $181 = $R7$0 + 20 | 0;
       $182 = HEAP32[$181 >> 2] | 0;
       $183 = ($182 | 0) == (0 | 0);
       if (!$183) {
        $R7$0 = $182;
        $RP9$0 = $181;
        continue;
       }
       $184 = $R7$0 + 16 | 0;
       $185 = HEAP32[$184 >> 2] | 0;
       $186 = ($185 | 0) == (0 | 0);
       if ($186) {
        $R7$0$lcssa = $R7$0;
        $RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;
        $RP9$0 = $184;
       }
      }
      $187 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
      $188 = $RP9$0$lcssa >>> 0 < $187 >>> 0;
      if ($188) {
       _abort();
      } else {
       HEAP32[$RP9$0$lcssa >> 2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = $mem + $8 | 0;
      $166 = HEAP32[$165 >> 2] | 0;
      $167 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
      $168 = $166 >>> 0 < $167 >>> 0;
      if ($168) {
       _abort();
      }
      $169 = $166 + 12 | 0;
      $170 = HEAP32[$169 >> 2] | 0;
      $171 = ($170 | 0) == ($9 | 0);
      if (!$171) {
       _abort();
      }
      $172 = $163 + 8 | 0;
      $173 = HEAP32[$172 >> 2] | 0;
      $174 = ($173 | 0) == ($9 | 0);
      if ($174) {
       HEAP32[$169 >> 2] = $163;
       HEAP32[$172 >> 2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
      }
     }
    } while (0);
    $189 = ($161 | 0) == (0 | 0);
    if (!$189) {
     $$sum18 = $8 + 20 | 0;
     $190 = $mem + $$sum18 | 0;
     $191 = HEAP32[$190 >> 2] | 0;
     $192 = (147e3 + ($191 << 2) | 0) + 304 | 0;
     $193 = HEAP32[$192 >> 2] | 0;
     $194 = ($9 | 0) == ($193 | 0);
     if ($194) {
      HEAP32[$192 >> 2] = $R7$1;
      $cond54 = ($R7$1 | 0) == (0 | 0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
       $198 = $197 & $196;
       HEAP32[(147e3 + 4 | 0) >> 2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
      $200 = $161 >>> 0 < $199 >>> 0;
      if ($200) {
       _abort();
      }
      $201 = $161 + 16 | 0;
      $202 = HEAP32[$201 >> 2] | 0;
      $203 = ($202 | 0) == ($9 | 0);
      if ($203) {
       HEAP32[$201 >> 2] = $R7$1;
      } else {
       $204 = $161 + 20 | 0;
       HEAP32[$204 >> 2] = $R7$1;
      }
      $205 = ($R7$1 | 0) == (0 | 0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $207 = $R7$1 >>> 0 < $206 >>> 0;
     if ($207) {
      _abort();
     }
     $208 = $R7$1 + 24 | 0;
     HEAP32[$208 >> 2] = $161;
     $$sum19 = $8 + 8 | 0;
     $209 = $mem + $$sum19 | 0;
     $210 = HEAP32[$209 >> 2] | 0;
     $211 = ($210 | 0) == (0 | 0);
     do {
      if (!$211) {
       $212 = $210 >>> 0 < $206 >>> 0;
       if ($212) {
        _abort();
       } else {
        $213 = $R7$1 + 16 | 0;
        HEAP32[$213 >> 2] = $210;
        $214 = $210 + 24 | 0;
        HEAP32[$214 >> 2] = $R7$1;
        break;
       }
      }
     } while (0);
     $$sum20 = $8 + 12 | 0;
     $215 = $mem + $$sum20 | 0;
     $216 = HEAP32[$215 >> 2] | 0;
     $217 = ($216 | 0) == (0 | 0);
     if (!$217) {
      $218 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
      $219 = $216 >>> 0 < $218 >>> 0;
      if ($219) {
       _abort();
      } else {
       $220 = $R7$1 + 20 | 0;
       HEAP32[$220 >> 2] = $216;
       $221 = $216 + 24 | 0;
       HEAP32[$221 >> 2] = $R7$1;
       break;
      }
     }
    }
   }
  } while (0);
  $222 = $133 | 1;
  $223 = $p$0 + 4 | 0;
  HEAP32[$223 >> 2] = $222;
  $224 = $p$0 + $133 | 0;
  HEAP32[$224 >> 2] = $133;
  $225 = HEAP32[(147e3 + 20 | 0) >> 2] | 0;
  $226 = ($p$0 | 0) == ($225 | 0);
  if ($226) {
   HEAP32[(147e3 + 8 | 0) >> 2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111 >> 2] = $227;
  $228 = $psize$0 | 1;
  $229 = $p$0 + 4 | 0;
  HEAP32[$229 >> 2] = $228;
  $230 = $p$0 + $psize$0 | 0;
  HEAP32[$230 >> 2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = $psize$1 >>> 0 < 256;
 if ($232) {
  $233 = $231 << 1;
  $234 = (147e3 + ($233 << 2) | 0) + 40 | 0;
  $235 = HEAP32[147e3 >> 2] | 0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237 | 0) == 0;
  if ($238) {
   $239 = $235 | $236;
   HEAP32[147e3 >> 2] = $239;
   $$sum16$pre = $233 + 2 | 0;
   $$pre = (147e3 + ($$sum16$pre << 2) | 0) + 40 | 0;
   $$pre$phiZ2D = $$pre;
   $F16$0 = $234;
  } else {
   $$sum17 = $233 + 2 | 0;
   $240 = (147e3 + ($$sum17 << 2) | 0) + 40 | 0;
   $241 = HEAP32[$240 >> 2] | 0;
   $242 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
   $243 = $241 >>> 0 < $242 >>> 0;
   if ($243) {
    _abort();
   } else {
    $$pre$phiZ2D = $240;
    $F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D >> 2] = $p$0;
  $244 = $F16$0 + 12 | 0;
  HEAP32[$244 >> 2] = $p$0;
  $245 = $p$0 + 8 | 0;
  HEAP32[$245 >> 2] = $F16$0;
  $246 = $p$0 + 12 | 0;
  HEAP32[$246 >> 2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247 | 0) == 0;
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = $psize$1 >>> 0 > 16777215;
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = $247 + 1048320 | 0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = $253 + 520192 | 0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = $258 + 245760 | 0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = 14 - $262 | 0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = $263 + $265 | 0;
   $267 = $266 << 1;
   $268 = $266 + 7 | 0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (147e3 + ($I18$0 << 2) | 0) + 304 | 0;
 $273 = $p$0 + 28 | 0;
 $I18$0$c = $I18$0;
 HEAP32[$273 >> 2] = $I18$0$c;
 $274 = $p$0 + 20 | 0;
 HEAP32[$274 >> 2] = 0;
 $275 = $p$0 + 16 | 0;
 HEAP32[$275 >> 2] = 0;
 $276 = HEAP32[(147e3 + 4 | 0) >> 2] | 0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278 | 0) == 0;
 L199 : do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(147e3 + 4 | 0) >> 2] = $280;
   HEAP32[$272 >> 2] = $p$0;
   $281 = $p$0 + 24 | 0;
   HEAP32[$281 >> 2] = $272;
   $282 = $p$0 + 12 | 0;
   HEAP32[$282 >> 2] = $p$0;
   $283 = $p$0 + 8 | 0;
   HEAP32[$283 >> 2] = $p$0;
  } else {
   $284 = HEAP32[$272 >> 2] | 0;
   $285 = ($I18$0 | 0) == 31;
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = 25 - $286 | 0;
    $293 = $287;
   }
   $288 = $284 + 4 | 0;
   $289 = HEAP32[$288 >> 2] | 0;
   $290 = $289 & -8;
   $291 = ($290 | 0) == ($psize$1 | 0);
   L205 : do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$060 = $292;
     $T$059 = $284;
     while (1) {
      $300 = $K19$060 >>> 31;
      $301 = ($T$059 + ($300 << 2) | 0) + 16 | 0;
      $296 = HEAP32[$301 >> 2] | 0;
      $302 = ($296 | 0) == (0 | 0);
      if ($302) {
       $$lcssa = $301;
       $T$059$lcssa = $T$059;
       break;
      }
      $294 = $K19$060 << 1;
      $295 = $296 + 4 | 0;
      $297 = HEAP32[$295 >> 2] | 0;
      $298 = $297 & -8;
      $299 = ($298 | 0) == ($psize$1 | 0);
      if ($299) {
       $T$0$lcssa = $296;
       break L205;
      } else {
       $K19$060 = $294;
       $T$059 = $296;
      }
     }
     $303 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
     $304 = $$lcssa >>> 0 < $303 >>> 0;
     if ($304) {
      _abort();
     } else {
      HEAP32[$$lcssa >> 2] = $p$0;
      $305 = $p$0 + 24 | 0;
      HEAP32[$305 >> 2] = $T$059$lcssa;
      $306 = $p$0 + 12 | 0;
      HEAP32[$306 >> 2] = $p$0;
      $307 = $p$0 + 8 | 0;
      HEAP32[$307 >> 2] = $p$0;
      break L199;
     }
    }
   } while (0);
   $308 = $T$0$lcssa + 8 | 0;
   $309 = HEAP32[$308 >> 2] | 0;
   $310 = HEAP32[(147e3 + 16 | 0) >> 2] | 0;
   $311 = $T$0$lcssa >>> 0 >= $310 >>> 0;
   $312 = $309 >>> 0 >= $310 >>> 0;
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = $309 + 12 | 0;
    HEAP32[$313 >> 2] = $p$0;
    HEAP32[$308 >> 2] = $p$0;
    $314 = $p$0 + 8 | 0;
    HEAP32[$314 >> 2] = $309;
    $315 = $p$0 + 12 | 0;
    HEAP32[$315 >> 2] = $T$0$lcssa;
    $316 = $p$0 + 24 | 0;
    HEAP32[$316 >> 2] = 0;
    break;
   } else {
    _abort();
   }
  }
 } while (0);
 $317 = HEAP32[(147e3 + 32 | 0) >> 2] | 0;
 $318 = $317 + -1 | 0;
 HEAP32[(147e3 + 32 | 0) >> 2] = $318;
 $319 = ($318 | 0) == 0;
 if ($319) {
  $sp$0$in$i = 147e3 + 456 | 0;
 } else {
  return;
 }
 while (1) {
  $sp$0$i = HEAP32[$sp$0$in$i >> 2] | 0;
  $320 = ($sp$0$i | 0) == (0 | 0);
  $321 = $sp$0$i + 8 | 0;
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(147e3 + 32 | 0) >> 2] = -1;
 return;
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjP2tmcc($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm, $__fmt, $0) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 $__fmt = $__fmt | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__fmt;
 HEAP32[EMTSTACKTOP + 64 >> 2] = $0;
 emterpret(746636);
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjP2tmcc($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm, $__fmt, $0) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 $__fmt = $__fmt | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__fmt;
 HEAP32[EMTSTACKTOP + 64 >> 2] = $0;
 emterpret(748904);
}

function __ZNKSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_bRNS_8ios_baseERjRNS_12basic_stringIwS3_NS_9allocatorIwEEEE($agg$result, $this, $__b, $__e, $__intl, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__v;
 emterpret(958172);
}

function __ZNKSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_bRNS_8ios_baseERjRNS_12basic_stringIcS3_NS_9allocatorIcEEEE($agg$result, $this, $__b, $__e, $__intl, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__v;
 emterpret(959784);
}

function _memcpy(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 if ((num | 0) >= 4096) return _emscripten_memcpy_big(dest | 0, src | 0, num | 0) | 0;
 ret = dest | 0;
 if ((dest & 3) == (src & 3)) {
  while (dest & 3) {
   if ((num | 0) == 0) return ret | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
   dest = dest + 1 | 0;
   src = src + 1 | 0;
   num = num - 1 | 0;
  }
  while ((num | 0) >= 4) {
   HEAP32[dest >> 2] = HEAP32[src >> 2] | 0;
   dest = dest + 4 | 0;
   src = src + 4 | 0;
   num = num - 4 | 0;
  }
 }
 while ((num | 0) > 0) {
  HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  dest = dest + 1 | 0;
  src = src + 1 | 0;
  num = num - 1 | 0;
 }
 return ret | 0;
}

function __ZNKSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_bRNS_8ios_baseERjRe($agg$result, $this, $__b, $__e, $__intl, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__v;
 emterpret(925928);
}

function __ZNKSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_bRNS_8ios_baseERjRe($agg$result, $this, $__b, $__e, $__intl, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__v;
 emterpret(935208);
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE6do_outERS1_PKwS5_RS5_PcS7_RS7_($this, $st, $frm, $frm_end, $frm_nxt, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $st = $st | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $st;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(904952);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE5do_inERS1_PKcS5_RS5_PwS7_RS7_($this, $st, $frm, $frm_end, $frm_nxt, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $st = $st | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $st;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(907068);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE6do_outERS1_PKDsS5_RS5_PcS7_RS7_($this, $0, $frm, $frm_end, $frm_nxt, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(1211596);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE6do_outERS1_PKDiS5_RS5_PcS7_RS7_($this, $0, $frm, $frm_end, $frm_nxt, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(1212436);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_bRNS_8ios_baseEwRKNS_12basic_stringIwS3_NS_9allocatorIwEEEE($agg$result, $this, $__s, $__intl, $__iob, $__fl, $__digits) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__digits = $__digits | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__digits;
 emterpret(918324);
}

function __ZNKSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_bRNS_8ios_baseEcRKNS_12basic_stringIcS3_NS_9allocatorIcEEEE($agg$result, $this, $__s, $__intl, $__iob, $__fl, $__digits) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__digits = $__digits | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__digits;
 emterpret(924796);
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE5do_inERS1_PKcS5_RS5_PDsS7_RS7_($this, $0, $frm, $frm_end, $frm_nxt, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(1212292);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE5do_inERS1_PKcS5_RS5_PDiS7_RS7_($this, $0, $frm, $frm_end, $frm_nxt, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(1212940);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _memset(ptr, value, num) {
 ptr = ptr | 0;
 value = value | 0;
 num = num | 0;
 var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
 stop = ptr + num | 0;
 if ((num | 0) >= 20) {
  value = value & 255;
  unaligned = ptr & 3;
  value4 = value | value << 8 | value << 16 | value << 24;
  stop4 = stop & ~3;
  if (unaligned) {
   unaligned = ptr + 4 - unaligned | 0;
   while ((ptr | 0) < (unaligned | 0)) {
    HEAP8[ptr >> 0] = value;
    ptr = ptr + 1 | 0;
   }
  }
  while ((ptr | 0) < (stop4 | 0)) {
   HEAP32[ptr >> 2] = value4;
   ptr = ptr + 4 | 0;
  }
 }
 while ((ptr | 0) < (stop | 0)) {
  HEAP8[ptr >> 0] = value;
  ptr = ptr + 1 | 0;
 }
 return ptr - num | 0;
}

function __ZNKSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwPK2tmcc($agg$result, $this, $__s, $0, $1, $__tm, $__fmt, $__mod) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 $__tm = $__tm | 0;
 $__fmt = $__fmt | 0;
 $__mod = $__mod | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__tm;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__fmt;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__mod;
 emterpret(1131064);
}

function __ZNKSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcPK2tmcc($agg$result, $this, $__s, $0, $1, $__tm, $__fmt, $__mod) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 $__tm = $__tm | 0;
 $__fmt = $__fmt | 0;
 $__mod = $__mod | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__tm;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__fmt;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $__mod;
 emterpret(1127384);
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE6do_outERS1_PKcS5_RS5_PcS7_RS7_($this, $0, $frm, $1, $frm_nxt, $to, $2, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $1 = $1 | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $2 = $2 | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $2;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(1306296);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE5do_inERS1_PKcS5_RS5_PcS7_RS7_($this, $0, $frm, $1, $frm_nxt, $to, $2, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $1 = $1 | 0;
 $frm_nxt = $frm_nxt | 0;
 $to = $to | 0;
 $2 = $2 | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $frm_nxt;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $2;
 HEAP32[EMTSTACKTOP + 56 >> 2] = $to_nxt;
 emterpret(1306604);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_bRNS_8ios_baseEwe($agg$result, $this, $__s, $__intl, $__iob, $__fl, $__units) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__units = +$__units;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__fl;
 HEAPF64[EMTSTACKTOP + 48 >> 3] = $__units;
 emterpret(919500);
}

function __ZNKSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_bRNS_8ios_baseEce($agg$result, $this, $__s, $__intl, $__iob, $__fl, $__units) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__intl = $__intl | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__units = +$__units;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__intl;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__fl;
 HEAPF64[EMTSTACKTOP + 48 >> 3] = $__units;
 emterpret(929152);
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE16do_get_monthnameES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1204284);
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE16do_get_monthnameES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1204572);
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE14do_get_weekdayES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1204428);
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE14do_get_weekdayES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1204716);
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_yearES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1206456);
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_timeES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1217412);
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_dateES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1145228);
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_yearES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1206600);
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_timeES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1217540);
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_dateES4_S4_RNS_8ios_baseERjP2tm($agg$result, $this, $__b, $__e, $__iob, $__err, $__tm) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__tm = $__tm | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__tm;
 emterpret(1147356);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjS8_($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1223356);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjS8_($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1223460);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRy($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1223772);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRx($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1225216);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRt($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1223876);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRm($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1223980);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRl($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1225320);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRf($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1220604);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRe($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1220708);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRd($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1220812);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRb($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1047412);
}

function __ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRPv($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(835164);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRy($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1224084);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRx($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1225424);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRt($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1224188);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRm($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1224292);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRl($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1225528);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRf($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1220916);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRe($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1221020);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRd($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1221124);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRb($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(1047908);
}

function __ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRPv($agg$result, $this, $__b, $__e, $__iob, $__err, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__b = $__b | 0;
 $__e = $__e | 0;
 $__iob = $__iob | 0;
 $__err = $__err | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__b;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__e;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__err;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $__v;
 emterpret(845888);
}

function __ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this, $info, $dst_ptr, $current_ptr, $path_below, $use_strcmp) {
 $this = $this | 0;
 $info = $info | 0;
 $dst_ptr = $dst_ptr | 0;
 $current_ptr = $current_ptr | 0;
 $path_below = $path_below | 0;
 $use_strcmp = $use_strcmp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $dst_ptr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $current_ptr;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $path_below;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $use_strcmp;
 emterpret(1080588);
}

function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this, $info, $dst_ptr, $current_ptr, $path_below, $use_strcmp) {
 $this = $this | 0;
 $info = $info | 0;
 $dst_ptr = $dst_ptr | 0;
 $current_ptr = $current_ptr | 0;
 $path_below = $path_below | 0;
 $use_strcmp = $use_strcmp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $dst_ptr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $current_ptr;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $path_below;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $use_strcmp;
 emterpret(1232108);
}

function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this, $info, $dst_ptr, $current_ptr, $path_below, $use_strcmp) {
 $this = $this | 0;
 $info = $info | 0;
 $dst_ptr = $dst_ptr | 0;
 $current_ptr = $current_ptr | 0;
 $path_below = $path_below | 0;
 $use_strcmp = $use_strcmp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $dst_ptr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $current_ptr;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $path_below;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $use_strcmp;
 emterpret(1265276);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwy($agg$result, $this, $__s, $__iob, $__fl, $0, $1) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $1;
 emterpret(1118228);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwx($agg$result, $this, $__s, $__iob, $__fl, $0, $1) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $1;
 emterpret(1118536);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcy($agg$result, $this, $__s, $__iob, $__fl, $0, $1) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $1;
 emterpret(1119172);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcx($agg$result, $this, $__s, $__iob, $__fl, $0, $1) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 48 >> 2] = $1;
 emterpret(1119808);
}

function __ZNKSt3__18messagesIcE6do_getEiiiRKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE($agg$result, $this, $__c, $__set, $__msgid, $__dflt) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__c = $__c | 0;
 $__set = $__set | 0;
 $__msgid = $__msgid | 0;
 $__dflt = $__dflt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__c;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__set;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__msgid;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__dflt;
 emterpret(1063548);
}

function __ZNKSt3__18messagesIwE6do_getEiiiRKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE($agg$result, $this, $__c, $__set, $__msgid, $__dflt) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__c = $__c | 0;
 $__set = $__set | 0;
 $__msgid = $__msgid | 0;
 $__dflt = $__dflt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__c;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__set;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__msgid;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__dflt;
 emterpret(956444);
}

function __ZN12_GLOBAL__N_111ubo_visitor11visit_fieldEPK9glsl_typePKcbS3_b($this, $type, $name, $row_major, $record_type, $last_field) {
 $this = $this | 0;
 $type = $type | 0;
 $name = $name | 0;
 $row_major = $row_major | 0;
 $record_type = $record_type | 0;
 $last_field = $last_field | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $type;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $name;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $row_major;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $record_type;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $last_field;
 emterpret(1064020);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwPKv($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1110412);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcPKv($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1111532);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwm($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1113756);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwl($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1114096);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwb($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1024856);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcm($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1114436);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcl($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1114772);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcb($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = $__v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $__v;
 emterpret(1022848);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwd($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = +$__v;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAPF64[EMTSTACKTOP + 40 >> 3] = $__v;
 emterpret(1001360);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcd($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = +$__v;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAPF64[EMTSTACKTOP + 40 >> 3] = $__v;
 emterpret(1000708);
}

function __ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwe($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = +$__v;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAPF64[EMTSTACKTOP + 40 >> 3] = $__v;
 emterpret(989788);
}

function __ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEce($agg$result, $this, $__s, $__iob, $__fl, $__v) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__s = $__s | 0;
 $__iob = $__iob | 0;
 $__fl = $__fl | 0;
 $__v = +$__v;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__iob;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__fl;
 HEAPF64[EMTSTACKTOP + 40 >> 3] = $__v;
 emterpret(991820);
}

function __ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this, $info, $current_ptr, $path_below, $use_strcmp) {
 $this = $this | 0;
 $info = $info | 0;
 $current_ptr = $current_ptr | 0;
 $path_below = $path_below | 0;
 $use_strcmp = $use_strcmp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $current_ptr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $path_below;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $use_strcmp;
 emterpret(823292);
}

function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this, $info, $current_ptr, $path_below, $use_strcmp) {
 $this = $this | 0;
 $info = $info | 0;
 $current_ptr = $current_ptr | 0;
 $path_below = $path_below | 0;
 $use_strcmp = $use_strcmp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $current_ptr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $path_below;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $use_strcmp;
 emterpret(1019996);
}

function b8(p0, p1, p2, p3, p4, p5, p6, p7, p8) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 p6 = p6 | 0;
 p7 = p7 | 0;
 p8 = p8 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAP32[EMTSTACKTOP + 40 >> 2] = p5;
 HEAP32[EMTSTACKTOP + 48 >> 2] = p6;
 HEAP32[EMTSTACKTOP + 56 >> 2] = p7;
 HEAP32[EMTSTACKTOP + 64 >> 2] = p8;
 emterpret(1351724);
}

function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this, $info, $current_ptr, $path_below, $use_strcmp) {
 $this = $this | 0;
 $info = $info | 0;
 $current_ptr = $current_ptr | 0;
 $path_below = $path_below | 0;
 $use_strcmp = $use_strcmp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $current_ptr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $path_below;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $use_strcmp;
 emterpret(1123320);
}

function b14(p0, p1, p2, p3, p4, p5, p6, p7) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 p6 = p6 | 0;
 p7 = p7 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAP32[EMTSTACKTOP + 40 >> 2] = p5;
 HEAP32[EMTSTACKTOP + 48 >> 2] = p6;
 HEAP32[EMTSTACKTOP + 56 >> 2] = p7;
 emterpret(1352128);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24program_resource_visitor11visit_fieldEPK9glsl_typePKcbS2_b($this, $type, $name, $row_major, $0, $1) {
 $this = $this | 0;
 $type = $type | 0;
 $name = $name | 0;
 $row_major = $row_major | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $type;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $name;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $row_major;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $1;
 emterpret(1291904);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE7seekoffExNS_8ios_base7seekdirEj($agg$result, $this, $0, $1, $2, $3) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 $3 = $3 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $2;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $3;
 emterpret(1271340);
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE7seekoffExNS_8ios_base7seekdirEj($agg$result, $this, $0, $1, $2, $3) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 $3 = $3 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $2;
 HEAP32[EMTSTACKTOP + 40 >> 2] = $3;
 emterpret(1271432);
}

function b16(p0, p1, p2, p3, p4, p5, p6, p7) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 p6 = p6 | 0;
 p7 = p7 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAP32[EMTSTACKTOP + 40 >> 2] = p5;
 HEAP32[EMTSTACKTOP + 48 >> 2] = p6;
 HEAP32[EMTSTACKTOP + 56 >> 2] = p7;
 emterpret(1354928);
}

function copyTempDouble(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr >> 0] = HEAP8[ptr >> 0];
 HEAP8[tempDoublePtr + 1 >> 0] = HEAP8[ptr + 1 >> 0];
 HEAP8[tempDoublePtr + 2 >> 0] = HEAP8[ptr + 2 >> 0];
 HEAP8[tempDoublePtr + 3 >> 0] = HEAP8[ptr + 3 >> 0];
 HEAP8[tempDoublePtr + 4 >> 0] = HEAP8[ptr + 4 >> 0];
 HEAP8[tempDoublePtr + 5 >> 0] = HEAP8[ptr + 5 >> 0];
 HEAP8[tempDoublePtr + 6 >> 0] = HEAP8[ptr + 6 >> 0];
 HEAP8[tempDoublePtr + 7 >> 0] = HEAP8[ptr + 7 >> 0];
}

function __ZNKSt3__17collateIwE10do_compareEPKwS3_S3_S3_($this, $__lo1, $__hi1, $__lo2, $__hi2) {
 $this = $this | 0;
 $__lo1 = $__lo1 | 0;
 $__hi1 = $__hi1 | 0;
 $__lo2 = $__lo2 | 0;
 $__hi2 = $__hi2 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__lo1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__hi1;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__lo2;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__hi2;
 emterpret(1195816);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17collateIcE10do_compareEPKcS3_S3_S3_($this, $__lo1, $__hi1, $__lo2, $__hi2) {
 $this = $this | 0;
 $__lo1 = $__lo1 | 0;
 $__hi1 = $__hi1 | 0;
 $__lo2 = $__lo2 | 0;
 $__hi2 = $__hi2 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__lo1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__hi1;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__lo2;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $__hi2;
 emterpret(1192800);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE10do_unshiftERS1_PcS4_RS4_($this, $st, $to, $to_end, $to_nxt) {
 $this = $this | 0;
 $st = $st | 0;
 $to = $to | 0;
 $to_end = $to_end | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $st;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $to_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $to_nxt;
 emterpret(1162324);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE9do_lengthERS1_PKcS5_j($this, $st, $frm, $frm_end, $mx) {
 $this = $this | 0;
 $st = $st | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $mx = $mx | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $st;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $mx;
 emterpret(1154228);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE9do_lengthERS1_PKcS5_j($this, $0, $frm, $frm_end, $mx) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $mx = $mx | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $mx;
 emterpret(1311732);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE9do_lengthERS1_PKcS5_j($this, $0, $frm, $frm_end, $mx) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $frm_end = $frm_end | 0;
 $mx = $mx | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $frm_end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $mx;
 emterpret(1311972);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this, $info, $adjustedPtr, $path_below) {
 $this = $this | 0;
 $info = $info | 0;
 $adjustedPtr = $adjustedPtr | 0;
 $path_below = $path_below | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $adjustedPtr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $path_below;
 emterpret(1168320);
}

function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this, $info, $adjustedPtr, $path_below) {
 $this = $this | 0;
 $info = $info | 0;
 $adjustedPtr = $adjustedPtr | 0;
 $path_below = $path_below | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $adjustedPtr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $path_below;
 emterpret(1245920);
}

function __ZNKSt3__15ctypeIwE9do_narrowEPKwS3_cPc($this, $low, $high, $dfault, $dest) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 $dfault = $dfault | 0;
 $dest = $dest | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $dfault;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $dest;
 emterpret(1213264);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE9do_narrowEPKcS3_cPc($this, $low, $high, $dfault, $dest) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 $dfault = $dfault | 0;
 $dest = $dest | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $dfault;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $dest;
 emterpret(1246016);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this, $info, $adjustedPtr, $path_below) {
 $this = $this | 0;
 $info = $info | 0;
 $adjustedPtr = $adjustedPtr | 0;
 $path_below = $path_below | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $info;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $adjustedPtr;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $path_below;
 emterpret(1276780);
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE10do_unshiftERS1_PcS4_RS4_($this, $0, $to, $1, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $to = $to | 0;
 $1 = $1 | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $to_nxt;
 emterpret(1330908);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE10do_unshiftERS1_PcS4_RS4_($this, $0, $to, $1, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $to = $to | 0;
 $1 = $1 | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $to_nxt;
 emterpret(1330940);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE10do_unshiftERS1_PcS4_RS4_($this, $0, $to, $1, $to_nxt) {
 $this = $this | 0;
 $0 = $0 | 0;
 $to = $to | 0;
 $1 = $1 | 0;
 $to_nxt = $to_nxt | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $to;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $to_nxt;
 emterpret(1331108);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _memmove(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 if ((src | 0) < (dest | 0) & (dest | 0) < (src + num | 0)) {
  ret = dest;
  src = src + num | 0;
  dest = dest + num | 0;
  while ((num | 0) > 0) {
   dest = dest - 1 | 0;
   src = src - 1 | 0;
   num = num - 1 | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  }
  dest = ret;
 } else {
  _memcpy(dest, src, num) | 0;
 }
 return dest | 0;
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE9do_lengthERS1_PKcS5_j($this, $0, $frm, $end, $mx) {
 $this = $this | 0;
 $0 = $0 | 0;
 $frm = $frm | 0;
 $end = $end | 0;
 $mx = $mx | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $frm;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $end;
 HEAP32[EMTSTACKTOP + 32 >> 2] = $mx;
 emterpret(1310608);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b4(p0, p1, p2, p3, p4, p5, p6) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 p6 = p6 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAP32[EMTSTACKTOP + 40 >> 2] = p5;
 HEAP32[EMTSTACKTOP + 48 >> 2] = p6;
 emterpret(1359300);
}

function b10(p0, p1, p2, p3, p4, p5, p6) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 p6 = +p6;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAP32[EMTSTACKTOP + 40 >> 2] = p5;
 HEAPF64[EMTSTACKTOP + 48 >> 3] = p6;
 emterpret(1359420);
}

function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($this, $thrown_type, $adjustedPtr) {
 $this = $this | 0;
 $thrown_type = $thrown_type | 0;
 $adjustedPtr = $adjustedPtr | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $thrown_type;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $adjustedPtr;
 emterpret(1159724);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_116count_block_size11visit_fieldEPK9glsl_typePKcb($this, $type, $name, $row_major) {
 $this = $this | 0;
 $type = $type | 0;
 $name = $name | 0;
 $row_major = $row_major | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $type;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $name;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $row_major;
 emterpret(1312824);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE7seekposENS_4fposI11__mbstate_tEEj($agg$result, $this, $0, $1) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 emterpret(1277216);
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE7seekposENS_4fposI11__mbstate_tEEj($agg$result, $this, $0, $1) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $1;
 emterpret(1277308);
}

function __ZN12_GLOBAL__N_111ubo_visitor11visit_fieldEPK9glsl_typePKcb($this, $type, $name, $row_major) {
 $this = $this | 0;
 $type = $type | 0;
 $name = $name | 0;
 $row_major = $row_major | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $type;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $name;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $row_major;
 emterpret(1336056);
}

function __ZN25ast_aggregate_initializer3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1132920);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ast_expression_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1279696);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ast_parameter_declarator3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(974892);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ast_selection_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1085600);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ast_iteration_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1080168);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ast_function_definition3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1019388);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ast_function_expression3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(726216);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ast_case_statement_list3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(986524);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN22ast_compound_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1186032);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN20ast_switch_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(967192);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN20ast_struct_specifier3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(987392);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN19ast_gs_input_layout3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1015724);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN19ast_case_label_list3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1239228);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE8do_widenEPKcS3_Pw($this, $low, $high, $dest) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 $dest = $dest | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $dest;
 emterpret(1258172);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE8do_widenEPKcS3_Pc($this, $low, $high, $dest) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 $dest = $dest | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $dest;
 emterpret(1264080);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN19ast_interface_block3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(703928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN19ast_declarator_list3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(694644);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN19ast_cs_input_layout3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(965244);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN18ast_case_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1092848);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN18ast_type_specifier3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(988944);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN18ast_jump_statement3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(865292);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN15ast_switch_body3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1281148);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN14ast_expression3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1314180);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17collateIwE12do_transformEPKwS3_($agg$result, $this, $__lo, $__hi) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__lo = $__lo | 0;
 $__hi = $__hi | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__lo;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__hi;
 emterpret(1300380);
}

function __ZNKSt3__17collateIcE12do_transformEPKcS3_($agg$result, $this, $__lo, $__hi) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $__lo = $__lo | 0;
 $__hi = $__hi | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__lo;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $__hi;
 emterpret(1300416);
}

function __ZN14ast_case_label3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(897540);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE5do_isEPKwS3_Pt($this, $low, $high, $vec) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 $vec = $vec | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $vec;
 emterpret(1201196);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12ast_function3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(890260);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b1(p0, p1, p2, p3, p4, p5) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAP32[EMTSTACKTOP + 40 >> 2] = p5;
 emterpret(1361416);
}

function __ZNKSt3__18messagesIwE7do_openERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERKNS_6localeE($this, $__nm, $0) {
 $this = $this | 0;
 $__nm = $__nm | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__nm;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 emterpret(1265716);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18messagesIcE7do_openERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERKNS_6localeE($this, $__nm, $0) {
 $this = $this | 0;
 $__nm = $__nm | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__nm;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 emterpret(1265832);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b12(p0, p1, p2, p3, p4, p5) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = +p5;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 HEAPF64[EMTSTACKTOP + 40 >> 3] = p5;
 emterpret(1361536);
}

function __ZNKSt3__15ctypeIwE11do_scan_notEtPKwS3_($this, $m, $low, $high) {
 $this = $this | 0;
 $m = $m | 0;
 $low = $low | 0;
 $high = $high | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $m;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $high;
 emterpret(1229276);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE10do_scan_isEtPKwS3_($this, $m, $low, $high) {
 $this = $this | 0;
 $m = $m | 0;
 $low = $low | 0;
 $high = $high | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $m;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 24 >> 2] = $high;
 emterpret(1231760);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN8ast_node3hirEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1338956);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__114error_category10equivalentEiRKNS_15error_conditionE($this, $code, $condition) {
 $this = $this | 0;
 $code = $code | 0;
 $condition = $condition | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $code;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $condition;
 emterpret(1247284);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN25ast_aggregate_initializer13hir_no_rvalueEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1297644);
}

function __ZNKSt3__114error_category10equivalentERKNS_10error_codeEi($this, $code, $condition) {
 $this = $this | 0;
 $code = $code | 0;
 $condition = $condition | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $code;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $condition;
 emterpret(1289480);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ast_function_expression13hir_no_rvalueEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1297932);
}

function _optimize_glsl($source, $shaderType, $vertexShader) {
 $source = $source | 0;
 $shaderType = $shaderType | 0;
 $vertexShader = $vertexShader | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $source;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $shaderType;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $vertexShader;
 emterpret(1060936);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b20(p0, p1, p2, p3, p4) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 emterpret(1361636);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN14ast_expression13hir_no_rvalueEP9exec_listP22_mesa_glsl_parse_state($this, $instructions, $state) {
 $this = $this | 0;
 $instructions = $instructions | 0;
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $instructions;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $state;
 emterpret(1315600);
}

function __ZN20ir_dereference_array6equalsEP14ir_instruction12ir_node_type($this, $ir, $ignore) {
 $this = $this | 0;
 $ir = $ir | 0;
 $ignore = $ignore | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ignore;
 emterpret(1190988);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 a7 = a7 | 0;
 a8 = a8 | 0;
 a9 = a9 | 0;
 FUNCTION_TABLE_viiiiiiiii[index & 3](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0, a7 | 0, a8 | 0, a9 | 0);
}

function ___cxa_can_catch($catchType, $excpType, $thrown) {
 $catchType = $catchType | 0;
 $excpType = $excpType | 0;
 $thrown = $thrown | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $catchType;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $excpType;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $thrown;
 emterpret(1267472);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_1L25tree_grafting_basic_blockEP14ir_instructionS1_Pv($bb_first, $bb_last, $data) {
 $bb_first = $bb_first | 0;
 $bb_last = $bb_last | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $bb_first;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $bb_last;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $data;
 emterpret(1024300);
}

function __ZN13ir_expression6equalsEP14ir_instruction12ir_node_type($this, $ir, $ignore) {
 $this = $this | 0;
 $ir = $ir | 0;
 $ignore = $ignore | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ignore;
 emterpret(1149592);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK23ir_dereference_variable5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1248116);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK22ir_precision_statement5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1311560);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN10ir_swizzle6equalsEP14ir_instruction12ir_node_type($this, $ir, $ignore) {
 $this = $this | 0;
 $ir = $ir | 0;
 $ignore = $ignore | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ignore;
 emterpret(1193696);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6xsputnEPKwi($this, $__s, $__n) {
 $this = $this | 0;
 $__s = $__s | 0;
 $__n = $__n | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__n;
 emterpret(1187256);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6xsputnEPKci($this, $__s, $__n) {
 $this = $this | 0;
 $__s = $__s | 0;
 $__n = $__n | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__n;
 emterpret(1185592);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK21ir_typedecl_statement5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1309820);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK21ir_function_signature5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1150200);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK21ir_dereference_record5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1269356);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN10ir_texture6equalsEP14ir_instruction12ir_node_type($this, $ir, $ignore) {
 $this = $this | 0;
 $ir = $ir | 0;
 $ignore = $ignore | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ignore;
 emterpret(995740);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6xsgetnEPwi($this, $__s, $__n) {
 $this = $this | 0;
 $__s = $__s | 0;
 $__n = $__n | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__n;
 emterpret(1184100);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6xsgetnEPci($this, $__s, $__n) {
 $this = $this | 0;
 $__s = $__s | 0;
 $__n = $__n | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__n;
 emterpret(1183172);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK20ir_dereference_array5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1248812);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_dereference_variable25constant_expression_valueEP10hash_table($this, $variable_context) {
 $this = $this | 0;
 $variable_context = $variable_context | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $variable_context;
 emterpret(1187020);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK16ir_end_primitive5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1280300);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _bitshift64Ashr(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 var ander = 0;
 if ((bits | 0) < 32) {
  ander = (1 << bits) - 1 | 0;
  tempRet0 = high >> bits;
  return low >>> bits | (high & ander) << 32 - bits;
 }
 tempRet0 = (high | 0) < 0 ? -1 : 0;
 return high >> bits - 32 | 0;
}

function __ZN23ir_dereference_variable6equalsEP14ir_instruction12ir_node_type($this, $ir, $0) {
 $this = $this | 0;
 $ir = $ir | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 emterpret(1278528);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN20ir_dereference_array25constant_expression_valueEP10hash_table($this, $variable_context) {
 $this = $this | 0;
 $variable_context = $variable_context | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $variable_context;
 emterpret(1012300);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK14ir_emit_vertex5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1281804);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK13ir_expression5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1143212);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK13ir_assignment5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1174356);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK12ir_loop_jump5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1313504);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 a7 = a7 | 0;
 a8 = a8 | 0;
 return FUNCTION_TABLE_iiiiiiiii[index & 15](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0, a7 | 0, a8 | 0) | 0;
}

function __ZNK11ir_variable5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1031564);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_function5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1171416);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1037524);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10ir_texture5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1017884);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10ir_swizzle5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1229596);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10ir_discard5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1263184);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK9ir_return5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1265608);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN13ir_expression25constant_expression_valueEP10hash_table($this, $variable_context) {
 $this = $this | 0;
 $variable_context = $variable_context | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $variable_context;
 emterpret(496660);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK7ir_loop5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1183592);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK7ir_call5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1120100);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b2(p0, p1, p2, p3, p4) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 HEAP32[EMTSTACKTOP + 32 >> 2] = p4;
 emterpret(1362200);
}

function __ZN10ir_swizzle25constant_expression_valueEP10hash_table($this, $variable_context) {
 $this = $this | 0;
 $variable_context = $variable_context | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $variable_context;
 emterpret(1044564);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZZ15remap_variablesP14ir_instructionP9gl_shaderP10hash_tableEN13remap_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1142368);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6setbufEPwi($this, $0, $1) {
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $1;
 emterpret(1343044);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6setbufEPci($this, $0, $1) {
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $1;
 emterpret(1343068);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17collateIwE7do_hashEPKwS3_($this, $__lo, $__hi) {
 $this = $this | 0;
 $__lo = $__lo | 0;
 $__hi = $__hi | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__lo;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__hi;
 emterpret(1250292);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17collateIcE7do_hashEPKcS3_($this, $__lo, $__hi) {
 $this = $this | 0;
 $__lo = $__lo | 0;
 $__hi = $__hi | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__lo;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__hi;
 emterpret(1246288);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK9ir_rvalue5cloneEPvP10hash_table($this, $mem_ctx, $0) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 emterpret(1335696);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK5ir_if5cloneEPvP10hash_table($this, $mem_ctx, $ht) {
 $this = $this | 0;
 $mem_ctx = $mem_ctx | 0;
 $ht = $ht | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $mem_ctx;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ht;
 emterpret(1069712);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function runPostSets() {}
function _i64Add(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = a;
 HEAP32[EMTSTACKTOP + 8 >> 2] = b;
 HEAP32[EMTSTACKTOP + 16 >> 2] = c;
 HEAP32[EMTSTACKTOP + 24 >> 2] = d;
 emterpret(1341452);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11ir_constant6equalsEP14ir_instruction12ir_node_type($this, $ir, $0) {
 $this = $this | 0;
 $ir = $ir | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 emterpret(1185348);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE10do_toupperEPwPKw($this, $low, $high) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 emterpret(1214152);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE10do_tolowerEPwPKw($this, $low, $high) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 emterpret(1214304);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE10do_toupperEPcPKc($this, $low, $high) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 emterpret(1240112);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE10do_tolowerEPcPKc($this, $low, $high) {
 $this = $this | 0;
 $low = $low | 0;
 $high = $high | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $low;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $high;
 emterpret(1240268);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN7ir_call25constant_expression_valueEP10hash_table($this, $variable_context) {
 $this = $this | 0;
 $variable_context = $variable_context | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $variable_context;
 emterpret(1296032);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 a7 = a7 | 0;
 a8 = a8 | 0;
 FUNCTION_TABLE_viiiiiiii[index & 7](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0, a7 | 0, a8 | 0);
}

function _bitshift64Shl(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 var ander = 0;
 if ((bits | 0) < 32) {
  ander = (1 << bits) - 1 | 0;
  tempRet0 = high << bits | (low & ander << 32 - bits) >>> 32 - bits;
  return low << bits;
 }
 tempRet0 = low << bits - 32;
 return 0;
}

function __ZNKSt3__114error_category23default_error_conditionEi($agg$result, $this, $ev) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $ev = $ev | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ev;
 emterpret(1323984);
}

function __ZNSt3__111__stdoutbufIwE6xsputnEPKwi($this, $__s, $__n) {
 $this = $this | 0;
 $__s = $__s | 0;
 $__n = $__n | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__n;
 emterpret(1196752);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__111__stdoutbufIcE6xsputnEPKci($this, $__s, $__n) {
 $this = $this | 0;
 $__s = $__s | 0;
 $__n = $__n | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $__n;
 emterpret(1193328);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE9do_narrowEwc($this, $c, $dfault) {
 $this = $this | 0;
 $c = $c | 0;
 $dfault = $dfault | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $dfault;
 emterpret(1327448);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE9do_narrowEcc($this, $c, $dfault) {
 $this = $this | 0;
 $c = $c | 0;
 $dfault = $dfault | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $dfault;
 emterpret(1327088);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _bitshift64Lshr(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 var ander = 0;
 if ((bits | 0) < 32) {
  ander = (1 << bits) - 1 | 0;
  tempRet0 = high >>> bits;
  return low >>> bits | (high & ander) << 32 - bits;
 }
 tempRet0 = 0;
 return high >>> bits - 32 | 0;
}

function b15(p0, p1, p2, p3) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 emterpret(1362224);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN14ir_instruction6equalsEPS_12ir_node_type($this, $0, $1) {
 $this = $this | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $1;
 emterpret(1352004);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL27dead_code_local_basic_blockP14ir_instructionS0_Pv($first, $last, $data) {
 $first = $first | 0;
 $last = $last | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $first;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $last;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $data;
 emterpret(1122332);
}

function __ZNKSt3__119__iostream_category7messageEi($agg$result, $this, $ev) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 $ev = $ev | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $ev;
 emterpret(1286732);
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1236640);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _i64Subtract(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = a;
 HEAP32[EMTSTACKTOP + 8 >> 2] = b;
 HEAP32[EMTSTACKTOP + 16 >> 2] = c;
 HEAP32[EMTSTACKTOP + 24 >> 2] = d;
 emterpret(1341652);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_leaveEP21ir_function_signature($this, $sig) {
 $this = $this | 0;
 $sig = $sig | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $sig;
 emterpret(1313624);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP21ir_function_signature($this, $sig) {
 $this = $this | 0;
 $sig = $sig | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $sig;
 emterpret(1313156);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1237840);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __mesa_new_shader($ctx, $name, $type) {
 $ctx = $ctx | 0;
 $name = $name | 0;
 $type = $type | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ctx;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $name;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $type;
 emterpret(1283744);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_130ir_structure_reference_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1321896);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_130ir_structure_reference_visitor11visit_enterEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1342736);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1342764);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN20array_sizing_visitor28fixup_unnamed_interface_typeEPKvPvS2_($key, $data, $0) {
 $key = $key | 0;
 $data = $data | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $key;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $0;
 emterpret(1084308);
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1173512);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1140160);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_vector_reference_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1322592);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1238488);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_126ir_array_reference_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1323076);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL25remove_unlinked_functionsPKvPvS1_($key, $data, $closure) {
 $key = $key | 0;
 $data = $data | 0;
 $closure = $closure | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $key;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $closure;
 emterpret(1180072);
}

function __ZN12_GLOBAL__N_130ir_structure_reference_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1266372);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_126ir_array_reference_visitor11visit_enterEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1230468);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_125ir_dead_functions_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1279776);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_121has_recursion_visitor11visit_leaveEP21ir_function_signature($this, $sig) {
 $this = $this | 0;
 $sig = $sig | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $sig;
 emterpret(1336016);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_121has_recursion_visitor11visit_enterEP21ir_function_signature($this, $sig) {
 $this = $this | 0;
 $sig = $sig | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $sig;
 emterpret(1313396);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_125geom_array_resize_visitor11visit_leaveEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1285056);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1343320);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1247668);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299568);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1227008);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 a7 = a7 | 0;
 FUNCTION_TABLE_viiiiiii[index & 63](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0, a7 | 0);
}

function __ZNKSt3__15ctypeIwE5do_isEtw($this, $m, $c) {
 $this = $this | 0;
 $m = $m | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $m;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $c;
 emterpret(1291128);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_130ir_structure_reference_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1239964);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_vector_reference_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1288220);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1187436);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant8is_valueEfi($this, $f, $i) {
 $this = $this | 0;
 $f = +$f;
 $i = $i | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAPF64[EMTSTACKTOP + 8 >> 3] = $f;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $i;
 emterpret(1090492);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_leaveEP10ir_swizzle($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1343520);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1138128);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1095400);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1343732);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_130ir_structure_splitting_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(976720);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_126ir_array_reference_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1288560);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL20emit_errors_unlinkedPKvPvS1_($key, $data, $closure) {
 $key = $key | 0;
 $data = $data | 0;
 $closure = $closure | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $key;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $closure;
 emterpret(1237508);
}

function __ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1300068);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_if_simplification_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1343812);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1343840);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1170132);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_125geom_array_resize_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1312084);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1265040);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_vector_reference_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1135264);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1274268);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_constant_folding_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1175980);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124is_cse_candidate_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1267928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1289540);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123kill_for_derefs_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1316376);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN33link_uniform_block_active_visitor11visit_enterEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(999316);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN31ir_variable_replacement_visitor11visit_leaveEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1325800);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1344296);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1344324);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1344352);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_126lower_instructions_visitor11visit_leaveEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(978384);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123lower_vertex_id_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(900148);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN31ir_variable_replacement_visitor11visit_leaveEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1326196);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1166504);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1139836);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1057456);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_vector_reference_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1208360);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1239676);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1242408);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1220220);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_117array_index_visit11visit_enterEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1290644);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiiiiid(index, a1, a2, a3, a4, a5, a6, a7) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 a7 = +a7;
 FUNCTION_TABLE_viiiiiid[index & 3](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0, +a7);
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1350624);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_126ir_swizzle_swizzle_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1023416);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP20ir_dereference_array($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1337944);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN28ir_variable_refcount_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1325844);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302748);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1249068);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1350744);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_121has_recursion_visitor11visit_enterEP7ir_call($this, $call) {
 $this = $this | 0;
 $call = $call | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $call;
 emterpret(1206744);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_130ir_structure_reference_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299304);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1296748);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1071504);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1317328);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1146672);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1095768);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_constant_folding_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1053740);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_125geom_array_resize_visitor5visitEP11ir_variable($this, $var) {
 $this = $this | 0;
 $var = $var | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $var;
 emterpret(1089264);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123kill_for_derefs_visitor11visit_leaveEP14ir_emit_vertex($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1193896);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1226652);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1312304);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1094592);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_117call_link_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1025424);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN33link_uniform_block_active_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(12e5);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_if_simplification_visitor11visit_leaveEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1151168);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_128ir_constant_variable_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1317272);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(113e4);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123redundant_jumps_visitor11visit_enterEP13ir_assignment($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351040);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_119nested_if_flattener11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1351288);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_111cse_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1289788);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN29interface_block_usage_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1225632);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_vector_reference_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301008);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1267832);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_125ir_dead_functions_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1298400);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN28ir_variable_refcount_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1225808);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1332224);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1298772);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1298852);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299144);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299224);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_126ir_array_reference_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301936);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1351588);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1031044);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1268492);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1332608);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299064);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299488);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123redundant_jumps_visitor11visit_leaveEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1251552);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1164928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1318588);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN33link_uniform_block_active_visitor5visitEP11ir_variable($this, $var) {
 $this = $this | 0;
 $var = $var | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $var;
 emterpret(1159996);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN31ir_variable_replacement_visitor11visit_leaveEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1327288);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN28ir_variable_refcount_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1240424);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN28ir_variable_refcount_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1294488);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN21ir_dereference_record25constant_expression_valueEP10hash_table($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1266264);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123redundant_jumps_visitor11visit_leaveEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1156228);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _do_read($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $f;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $buf;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $len;
 emterpret(1343348);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN27ir_vector_splitting_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1077904);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123kill_for_derefs_visitor5visitEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1201360);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120loop_control_visitor11visit_leaveEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1146388);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1297364);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP10ir_texture($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1339072);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1339196);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1308400);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN26ir_array_splitting_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1153924);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_struct_usage_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1256504);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP16ir_end_primitive($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1334080);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1300452);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP16ir_end_primitive($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299988);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP16ir_end_primitive($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1300532);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN30ir_function_can_inline_visitor11visit_enterEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1327844);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP22ir_precision_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1300848);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1333236);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1270748);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_119loop_unroll_visitor11visit_leaveEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(947536);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN31ir_variable_replacement_visitor11visit_leaveEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1153400);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1271216);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP14ir_emit_vertex($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1334796);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP21ir_typedecl_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301184);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP14ir_emit_vertex($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1300928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP14ir_emit_vertex($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301424);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_decl_removal_visitor5visitEP21ir_typedecl_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1288732);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17loop_unroll_count11visit_enterEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1055744);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1333600);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_119nested_if_flattener11visit_leaveEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1138748);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_117call_link_visitor11visit_leaveEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1111176);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function copyTempFloat(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr >> 0] = HEAP8[ptr >> 0];
 HEAP8[tempDoublePtr + 1 >> 0] = HEAP8[ptr + 1 >> 0];
 HEAP8[tempDoublePtr + 2 >> 0] = HEAP8[ptr + 2 >> 0];
 HEAP8[tempDoublePtr + 3 >> 0] = HEAP8[ptr + 3 >> 0];
}

function _calloc($n_elements, $elem_size) {
 $n_elements = $n_elements | 0;
 $elem_size = $elem_size | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $n_elements;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $elem_size;
 emterpret(1240888);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1335316);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1335356);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301264);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301344);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301712);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1301792);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_dereference_variable6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1318472);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_117call_link_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(913748);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b3(p0, p1, p2, p3) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 HEAP32[EMTSTACKTOP + 24 >> 2] = p3;
 emterpret(1362252);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9pbackfailEj($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351948);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9pbackfailEi($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351976);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN22ir_precision_statement6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1318644);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_117call_link_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1331520);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE8overflowEj($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352156);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE8overflowEi($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352184);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302176);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302668);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN21ir_typedecl_statement6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1318696);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN21ir_function_signature6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1213412);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN21ir_dereference_record6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1229428);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP13ir_expression($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1328572);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1336720);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1336760);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302428);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302508);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP10ir_discard($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302588);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1302956);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303036);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP10ir_discard($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303116);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN20ir_dereference_array6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1170920);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP16ir_end_primitive($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1335448);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN13ir_assignment25constant_expression_valueEP10hash_table($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351920);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_131ir_constant_propagation_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(902516);
}

function __ZN12_GLOBAL__N_130ir_structure_splitting_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1254388);
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1310928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN28ir_variable_refcount_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1308260);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis5visitEP12ir_loop_jump($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1308056);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_leaveEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(806016);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1337316);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303196);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303456);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP14ir_emit_vertex($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1336440);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_leaveEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1306224);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1306412);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_111cse_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1292388);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11ir_constant25constant_expression_valueEP10hash_table($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351832);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP10ir_texture($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1329440);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP10ir_discard($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1329484);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1336800);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1336840);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_127ir_constant_folding_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1112592);
}

function __ZN10ir_texture25constant_expression_valueEP10hash_table($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352284);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiiiii(index, a1, a2, a3, a4, a5, a6) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 FUNCTION_TABLE_viiiiii[index & 31](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0);
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1338580);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303536);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303616);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1303992);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304072);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN16ir_end_primitive6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1213808);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_113loop_analysis11visit_enterEP7ir_call($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1265948);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_111cse_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1246616);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN9ir_rvalue25constant_expression_valueEP10hash_table($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352592);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP9ir_return($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1329880);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP12ir_loop_jump($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304352);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN20array_sizing_visitor5visitEP11ir_variable($this, $var) {
 $this = $this | 0;
 $var = $var | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $var;
 emterpret(1086040);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_rvalue_enter_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1338872);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304656);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP11ir_constant($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304736);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_leaveEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304432);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor11visit_enterEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304816);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN21fixup_ir_call_visitor11visit_enterEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1297692);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1338020);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1338060);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN14ir_emit_vertex6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1214456);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_111cse_visitor11visit_enterEP7ir_call($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1353276);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11examine_rhs5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1283484);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP7ir_loop($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1330312);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17loop_unroll_count11visit_enterEP13ir_expression($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1330396);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17loop_unroll_count11visit_enterEP13ir_assignment($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1330440);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN13ir_expression6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1171176);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN13ir_assignment6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1135556);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_123ir_noop_swizzle_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1157932);
}

function __ZN12_GLOBAL__N_123contains_rvalue_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1299004);
}

function _sn_write($f, $s, $l) {
 $f = $f | 0;
 $s = $s | 0;
 $l = $l | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $f;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $s;
 HEAP32[EMTSTACKTOP + 16 >> 2] = $l;
 emterpret(1284696);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1338752);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12ir_loop_jump6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1320340);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN24ir_stats_counter_visitor11visit_leaveEP5ir_if($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1330796);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_hierarchical_visitor5visitEP9ir_rvalue($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1305648);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11ir_variable6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1320700);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11ir_function6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1243340);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11ir_constant6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1320752);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1338984);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_120ir_rebalance_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1238656);
}

function __ZN12_GLOBAL__N_120ir_algebraic_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1230628);
}

function __ZN10ir_swizzle6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1230300);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN10ir_discard6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1209648);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiiiid(index, a1, a2, a3, a4, a5, a6) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = +a6;
 FUNCTION_TABLE_viiiiid[index & 7](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, +a6);
}

function __ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor13handle_rvalueEPP9ir_rvalue($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(891564);
}

function __ZN10ir_texture6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(982536);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb1EE16do_positive_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1324600);
}

function __ZNKSt3__110moneypunctIwLb1EE16do_negative_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1328872);
}

function __ZNKSt3__110moneypunctIwLb0EE16do_positive_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1324648);
}

function __ZNKSt3__110moneypunctIwLb0EE16do_negative_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1328916);
}

function __ZNKSt3__110moneypunctIcLb1EE16do_positive_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1324696);
}

function __ZNKSt3__110moneypunctIcLb1EE16do_negative_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1328960);
}

function __ZNKSt3__110moneypunctIcLb0EE16do_positive_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1324744);
}

function __ZNKSt3__110moneypunctIcLb0EE16do_negative_signEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1329004);
}

function __ZN9ir_rvalue6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1326904);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN9ir_return6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1211396);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17ir_rvalue_visitor11visit_leaveEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1339512);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_117ir_minmax_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1183364);
}

function __ZNKSt3__110moneypunctIwLb1EE14do_curr_symbolEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1324984);
}

function __ZNKSt3__110moneypunctIwLb0EE14do_curr_symbolEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325032);
}

function __ZNKSt3__110moneypunctIcLb1EE14do_curr_symbolEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325080);
}

function __ZNKSt3__110moneypunctIcLb0EE14do_curr_symbolEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325128);
}

function __ZN7ir_loop6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1244228);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN7ir_call6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1176516);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN17loop_unroll_count11visit_enterEP7ir_loop($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1341732);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b0(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 emterpret(1362276);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__111__stdoutbufIwE8overflowEj($this, $__c) {
 $this = $this | 0;
 $__c = $__c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__c;
 emterpret(1079752);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__111__stdoutbufIcE8overflowEi($this, $__c) {
 $this = $this | 0;
 $__c = $__c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__c;
 emterpret(1076816);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__110__stdinbufIwE9pbackfailEj($this, $__c) {
 $this = $this | 0;
 $__c = $__c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__c;
 emterpret(1102060);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__110__stdinbufIcE9pbackfailEi($this, $__c) {
 $this = $this | 0;
 $__c = $__c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__c;
 emterpret(1097380);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb1EE13do_pos_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1308880);
}

function __ZNKSt3__110moneypunctIwLb1EE13do_neg_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1308988);
}

function __ZNKSt3__110moneypunctIwLb0EE13do_pos_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1309096);
}

function __ZNKSt3__110moneypunctIwLb0EE13do_neg_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1309204);
}

function __ZNKSt3__110moneypunctIcLb1EE13do_pos_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1309312);
}

function __ZNKSt3__110moneypunctIcLb1EE13do_neg_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1309420);
}

function __ZNKSt3__110moneypunctIcLb0EE13do_pos_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1309528);
}

function __ZNKSt3__110moneypunctIcLb0EE13do_neg_formatEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1309636);
}

function b17(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = +p1;
 p2 = p2 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAPF64[EMTSTACKTOP + 8 >> 3] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 emterpret(1362304);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN5ir_if6acceptEP23ir_hierarchical_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1167652);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_111ubo_visitor11visit_fieldEPK17glsl_struct_field($this, $field) {
 $this = $this | 0;
 $field = $field | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $field;
 emterpret(1296588);
}

function __ZNKSt3__110moneypunctIwLb1EE11do_groupingEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325500);
}

function __ZNKSt3__110moneypunctIwLb0EE11do_groupingEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325548);
}

function __ZNKSt3__110moneypunctIcLb1EE11do_groupingEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325596);
}

function __ZNKSt3__110moneypunctIcLb0EE11do_groupingEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1325644);
}

function __ZN27ir_vector_splitting_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1282208);
}

function __ZN24program_resource_visitor11visit_fieldEPK17glsl_struct_field($this, $field) {
 $this = $this | 0;
 $field = $field | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $field;
 emterpret(1350720);
}

function __ZN26ir_array_splitting_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1258768);
}

function __ZN12_GLOBAL__N_111cse_visitor13handle_rvalueEPP9ir_rvalue($this, $rvalue) {
 $this = $this | 0;
 $rvalue = $rvalue | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rvalue;
 emterpret(1255584);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP22ir_precision_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1350772);
}

function dynCall_iiiiii(index, a1, a2, a3, a4, a5) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 return FUNCTION_TABLE_iiiiii[index & 15](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0) | 0;
}

function _hash_table_pointer_compare($key1, $key2) {
 $key1 = $key1 | 0;
 $key2 = $key2 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $key1;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $key2;
 emterpret(1339928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP21ir_typedecl_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1350988);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(969120);
}

function __ZNKSt3__18numpunctIwE12do_falsenameEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1321616);
}

function __ZNKSt3__18numpunctIcE12do_falsenameEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1330264);
}

function __ZNKSt3__18numpunctIwE11do_truenameEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1321680);
}

function __ZNKSt3__18numpunctIwE11do_groupingEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1326116);
}

function __ZNKSt3__18numpunctIcE11do_truenameEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1330592);
}

function __ZNKSt3__18numpunctIcE11do_groupingEv($agg$result, $this) {
 $agg$result = $agg$result | 0;
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $agg$result;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $this;
 emterpret(1326156);
}

function __ZN12_GLOBAL__N_130dereferences_variable_callbackEP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1282836);
}

function __ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE13do_date_orderEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351532);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE13do_date_orderEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351560);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE10do_toupperEw($this, $c) {
 $this = $this | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 emterpret(1305800);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIwE10do_tolowerEw($this, $c) {
 $this = $this | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 emterpret(1305864);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE10do_toupperEc($this, $c) {
 $this = $this | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 emterpret(1292560);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE10do_tolowerEc($this, $c) {
 $this = $this | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 emterpret(1291212);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_121vector_insert_visitor13handle_rvalueEPP9ir_rvalue($this, $rv) {
 $this = $this | 0;
 $rv = $rv | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $rv;
 emterpret(883756);
}

function _realloc($oldmem, $bytes) {
 $oldmem = $oldmem | 0;
 $bytes = $bytes | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $oldmem;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $bytes;
 emterpret(1189564);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE5imbueERKNS_6localeE($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351676);
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE5imbueERKNS_6localeE($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1351700);
}

function __ZNKSt3__15ctypeIwE8do_widenEc($this, $c) {
 $this = $this | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 emterpret(1351796);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__15ctypeIcE8do_widenEc($this, $c) {
 $this = $this | 0;
 $c = $c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $c;
 emterpret(1358524);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL40has_only_undefined_precision_assignmentsP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1258892);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP12ir_loop_jump($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1286428);
}

function __ZN9glsl_type18record_key_compareEPKvS1_($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $a;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $b;
 emterpret(1284780);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1314780);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP10ir_discard($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1352032);
}

function dynCall_viiiii(index, a1, a2, a3, a4, a5) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 FUNCTION_TABLE_viiiii[index & 3](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0);
}

function __ZN22ir_print_metal_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1267236);
}

function __ZN22ir_print_metal_visitor5visitEP22ir_precision_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1352260);
}

function __ZN21ir_print_glsl_visitor5visitEP23ir_dereference_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1304896);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1299620);
}

function __ZN22ir_print_metal_visitor5visitEP21ir_typedecl_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1109252);
}

function __ZN22ir_print_metal_visitor5visitEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1257724);
}

function __ZN21ir_print_glsl_visitor5visitEP22ir_precision_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1286648);
}

function __ZNSt3__111__stdoutbufIwE5imbueERKNS_6localeE($this, $__loc) {
 $this = $this | 0;
 $__loc = $__loc | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__loc;
 emterpret(1263832);
}

function __ZNSt3__111__stdoutbufIcE5imbueERKNS_6localeE($this, $__loc) {
 $this = $this | 0;
 $__loc = $__loc | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__loc;
 emterpret(1263956);
}

function __ZN23ir_control_flow_visitor5visitEP23ir_dereference_variable($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352432);
}

function __ZN22ir_print_metal_visitor5visitEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(894940);
}

function __ZN22ir_print_metal_visitor5visitEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1233920);
}

function __ZN21ir_print_glsl_visitor5visitEP21ir_typedecl_statement($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1069240);
}

function __ZN21ir_print_glsl_visitor5visitEP21ir_dereference_record($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1258052);
}

function __ZNSt3__110__stdinbufIwE5imbueERKNS_6localeE($this, $__loc) {
 $this = $this | 0;
 $__loc = $__loc | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__loc;
 emterpret(1236108);
}

function __ZNSt3__110__stdinbufIcE5imbueERKNS_6localeE($this, $__loc) {
 $this = $this | 0;
 $__loc = $__loc | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__loc;
 emterpret(1236288);
}

function __ZN21ir_print_glsl_visitor5visitEP21ir_function_signature($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(946548);
}

function __ZN21ir_print_glsl_visitor5visitEP20ir_dereference_array($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1234088);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(941472);
}

function __ZN23ir_control_flow_visitor5visitEP21ir_dereference_record($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352692);
}

function __ZN23ir_control_flow_visitor5visitEP20ir_dereference_array($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1352804);
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(728796);
}

function __ZL30replace_return_with_assignmentP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1217668);
}

function __ZN22ir_print_metal_visitor5visitEP16ir_end_primitive($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1305424);
}

function __ZL12DeleteShaderP10gl_contextP9gl_shader($ctx, $shader) {
 $ctx = $ctx | 0;
 $shader = $shader | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ctx;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $shader;
 emterpret(1350652);
}

function __ZN21ir_print_glsl_visitor5visitEP16ir_end_primitive($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1305728);
}

function __ZN22ir_print_metal_visitor5visitEP14ir_emit_vertex($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1305928);
}

function __ZL36shader_packing_or_es3_or_gpu_shader5PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1277096);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_control_flow_visitor5visitEP16ir_end_primitive($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1353604);
}

function __ZN21ir_print_glsl_visitor5visitEP14ir_emit_vertex($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1306152);
}

function __ZN22ir_print_metal_visitor5visitEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(740144);
}

function __ZN22ir_print_metal_visitor5visitEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(985752);
}

function __ZN22ir_print_metal_visitor5visitEP12ir_loop_jump($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1284120);
}

function __ZL26propagate_precision_assignP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(992500);
}

function __ZL25propagate_precision_derefP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1122656);
}

function __ZN23ir_control_flow_visitor5visitEP14ir_emit_vertex($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1355704);
}

function __ZN22ir_print_metal_visitor5visitEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1073496);
}

function __ZN21ir_print_glsl_visitor5visitEP13ir_expression($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(849092);
}

function __ZN21ir_print_glsl_visitor5visitEP13ir_assignment($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(972296);
}

function __ZN21ir_print_glsl_visitor5visitEP12ir_loop_jump($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1284320);
}

function __ZL24propagate_precision_exprP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1141160);
}

function __ZL24propagate_precision_callP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1054280);
}

function __ZN23ir_control_flow_visitor5visitEP13ir_expression($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1356008);
}

function __ZN23ir_control_flow_visitor5visitEP13ir_assignment($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1356032);
}

function __ZN22ir_print_metal_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(744440);
}

function __ZN22ir_print_metal_visitor5visitEP11ir_constant($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(905872);
}

function __ZN22ir_print_metal_visitor5visitEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1022120);
}

function __ZN22ir_print_metal_visitor5visitEP10ir_discard($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1245608);
}

function __ZN21ir_print_glsl_visitor5visitEP11ir_function($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1073944);
}

function __ZN22ir_print_metal_visitor5visitEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(973120);
}

function __ZN21ir_print_glsl_visitor5visitEP11ir_variable($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(926908);
}

function __ZN21ir_print_glsl_visitor5visitEP11ir_constant($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(875424);
}

function __ZN21ir_print_glsl_visitor5visitEP10ir_swizzle($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1013012);
}

function __ZN21ir_print_glsl_visitor5visitEP10ir_discard($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1245764);
}

function __mesa_key_pointer_equal($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $a;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $b;
 emterpret(1352884);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_dereference_variable6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1325748);
}

function __ZN23ir_control_flow_visitor5visitEP11ir_variable($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1356628);
}

function __ZN23ir_control_flow_visitor5visitEP11ir_constant($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1356652);
}

function __ZN22ir_print_metal_visitor5visitEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1251116);
}

function __ZN21ir_print_glsl_visitor5visitEP10ir_texture($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(873904);
}

function __mesa_key_string_equal($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $a;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $b;
 emterpret(1343416);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN23ir_control_flow_visitor5visitEP10ir_texture($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1356740);
}

function __ZN23ir_control_flow_visitor5visitEP10ir_swizzle($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1356764);
}

function __ZN22ir_precision_statement6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1325892);
}

function __ZN21ir_print_glsl_visitor5visitEP9ir_return($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1251396);
}

function __ZL29shader_packing_or_gpu_shader5PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1305068);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_iiiii(index, a1, a2, a3, a4) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 return FUNCTION_TABLE_iiiii[index & 7](a1 | 0, a2 | 0, a3 | 0, a4 | 0) | 0;
}

function __ZN22ir_print_metal_visitor5visitEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1126136);
}

function __ZN22ir_print_metal_visitor5visitEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1068752);
}

function __ZN21ir_typedecl_statement6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1326300);
}

function __ZN21ir_function_signature6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1326352);
}

function __ZN21ir_dereference_record6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1326404);
}

function __ZN21ir_print_glsl_visitor5visitEP7ir_loop($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1126484);
}

function __ZN21ir_print_glsl_visitor5visitEP7ir_call($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1070176);
}

function __ZN20ir_dereference_array6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1326748);
}

function __ZL27shader_texture_lod_and_rectPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1297556);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b11(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 HEAP32[EMTSTACKTOP + 16 >> 2] = p2;
 emterpret(1362332);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9underflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1356928);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9showmanycEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357016);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9underflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1356956);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9showmanycEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357044);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN22ir_print_metal_visitor5visitEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1014380);
}

function __ZN23ir_control_flow_visitor5visitEP7ir_call($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1357144);
}

function __ZN21ir_print_glsl_visitor5visitEP5ir_if($this, $ir) {
 $this = $this | 0;
 $ir = $ir | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $ir;
 emterpret(1015052);
}

function __ZL25fs_texture_cube_map_arrayPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1279264);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL15rewrite_swizzleP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1081976);
}

function __ZN16ir_end_primitive6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1327332);
}

function __ZL23shader_image_load_storePK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1304224);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL14visit_variableP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1215244);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE5uflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1277488);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE5uflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1273132);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18messagesIwE8do_closeEi($this, $__c) {
 $this = $this | 0;
 $__c = $__c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__c;
 emterpret(1330676);
}

function __ZNKSt3__18messagesIcE8do_closeEi($this, $__c) {
 $this = $this | 0;
 $__c = $__c | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $__c;
 emterpret(1330736);
}

function __ZN23ir_dereference_variable25whole_variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1340072);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL22texture_cube_map_arrayPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1304512);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL22shader_atomic_countersPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1334512);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL22es_lod_exists_in_stagePK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1259016);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE4syncEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357892);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE4syncEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357920);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE16do_always_noconvEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357948);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE16do_always_noconvEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357976);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN14ir_emit_vertex6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1327888);
}

function __ZL21shader_trinary_minmaxPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1334652);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL21shader_packing_or_es3PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1303752);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL21fs_derivative_controlPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1279876);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL21es_shader_texture_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1334700);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL21compatibility_vs_onlyPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1277792);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL12is_reductionP14ir_instructionPv($ir, $data) {
 $ir = $ir | 0;
 $data = $data | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $data;
 emterpret(1082952);
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE16do_always_noconvEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358116);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE16do_always_noconvEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358144);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN13ir_expression6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1327940);
}

function __ZN13ir_assignment6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1327992);
}

function __ZL20texture_query_levelsPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1305340);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12ir_loop_jump6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328248);
}

function __ZL19texture_multisamplePK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1305564);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL19texture_gather_onlyPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1279576);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL19shader_bit_encodingPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1279040);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL19lod_exists_in_stagePK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1280384);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viiii(index, a1, a2, a3, a4) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 FUNCTION_TABLE_viiii[index & 15](a1 | 0, a2 | 0, a3 | 0, a4 | 0);
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE13do_max_lengthEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358468);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE13do_max_lengthEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358496);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN11ir_variable6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328416);
}

function __ZN11ir_function6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328468);
}

function __ZN11ir_constant6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328520);
}

function __ZL18shader_texture_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1334984);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL18shader_integer_mixPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1310804);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL18fs_oes_derivativesPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1280496);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL18es_shadow_samplersPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1335032);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE13do_max_lengthEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1294396);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE13do_max_lengthEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358644);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK23ir_dereference_variable19variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1341076);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN10ir_texture6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328616);
}

function __ZN10ir_swizzle6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328668);
}

function __ZN10ir_discard6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1328784);
}

function __ZL17texture_rectanglePK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1335536);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL17texture_query_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1300224);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL17texture_array_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1306076);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDsc11__mbstate_tE11do_encodingEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358708);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIDic11__mbstate_tE11do_encodingEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358736);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL16texture_externalPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1335648);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL16fs_texture_arrayPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1300688);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIwc11__mbstate_tE11do_encodingEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1256060);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__17codecvtIcc11__mbstate_tE11do_encodingEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358936);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK21ir_dereference_record19variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1313248);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN9ir_rvalue6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1329388);
}

function __ZN9ir_return6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1329048);
}

function __ZNKSt3__110moneypunctIwLb1EE16do_thousands_sepEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357240);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb1EE16do_decimal_pointEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357272);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb0EE16do_thousands_sepEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357304);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb0EE16do_decimal_pointEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357336);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIcLb1EE16do_thousands_sepEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358764);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIcLb1EE16do_decimal_pointEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358792);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIcLb0EE16do_thousands_sepEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358820);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIcLb0EE16do_decimal_pointEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358848);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK20ir_dereference_array19variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1313444);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN10ir_visitor5visitEP9ir_rvalue($this, $0) {
 $this = $this | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1359276);
}

function __ZL14texture_gatherPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1281028);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL14fs_gpu_shader5PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1282532);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _strcmp($l, $r) {
 $l = $l | 0;
 $r = $r | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $l;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $r;
 emterpret(1231552);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN7ir_loop6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1329640);
}

function __ZN7ir_call6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1329692);
}

function __ZL13texture_arrayPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1336480);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb1EE14do_frac_digitsEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359620);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIwLb0EE14do_frac_digitsEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359648);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIcLb1EE14do_frac_digitsEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359676);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__110moneypunctIcLb0EE14do_frac_digitsEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359704);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL12v130_fs_onlyPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1307416);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL12v110_fs_onlyPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1302256);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIwE8__monthsEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1033400);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE8__monthsEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1034252);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN5ir_if6acceptEP10ir_visitor($this, $v) {
 $this = $this | 0;
 $v = $v | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $v;
 emterpret(1330036);
}

function __ZL11gpu_shader5PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1307256);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIwE7__weeksEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1098092);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIwE7__am_pmEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1224920);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE7__weeksEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1098664);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE7__am_pmEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1224396);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL10gs_streamsPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1317588);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b18(p0, p1) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 emterpret(1362356);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL12update_typesP14ir_instructionPv($ir, $0) {
 $ir = $ir | 0;
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $ir;
 HEAP32[EMTSTACKTOP + 8 >> 2] = $0;
 emterpret(1199176);
}

function __ZL9tex3d_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1316428);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL9tex1d_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1307984);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18numpunctIwE16do_thousands_sepEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1341892);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18numpunctIwE16do_decimal_pointEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1341996);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18numpunctIcE16do_thousands_sepEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342028);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__18numpunctIcE16do_decimal_pointEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342060);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN9ir_rvalue25whole_variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359948);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL8v110_lodPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1308120);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL8fs_tex3dPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1278608);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__117__call_once_proxyINS_5tupleIJNS_12_GLOBAL__N_111__fake_bindEEEEEEvPv($__vp) {
 $__vp = $__vp | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $__vp;
 emterpret(1239480);
}

function __ZNKSt3__120__time_get_c_storageIwE3__xEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1274700);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIwE3__rEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1274872);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIwE3__cEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1275044);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIwE3__XEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1275216);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE3__xEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1280608);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE3__rEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1279988);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE3__cEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1280144);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__120__time_get_c_storageIcE3__XEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1280764);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL7gs_onlyPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1338792);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL7fs_onlyPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1338832);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant18is_uint16_constantEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1297852);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10ir_swizzle19variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1315084);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL5tex3dPK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1278924);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt3__119__iostream_category4nameEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359588);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL4v140PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1341108);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL4v130PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1340844);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL4v120PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1340888);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL4v110PK22_mesa_glsl_parse_state($state) {
 $state = $state | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $state;
 emterpret(1338620);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_iiii(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 return FUNCTION_TABLE_iiii[index & 127](a1 | 0, a2 | 0, a3 | 0) | 0;
}

function __ZNK9ir_rvalue19variable_referencedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360540);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352912);
}

function __ZNSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351108);
}

function __ZNSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352936);
}

function __ZNSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351144);
}

function __ZNSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352960);
}

function __ZNSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351180);
}

function __ZNSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352984);
}

function __ZNSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351216);
}

function __ZNSt3__110__stdinbufIwE9underflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342624);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__110__stdinbufIcE9underflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342664);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK9ir_rvalue18is_uint16_constantEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361036);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant15is_negative_oneEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1325692);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1339432);
}

function __ZNSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1336880);
}

function __ZNSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1339472);
}

function __ZNSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1336932);
}

function __ZNSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353180);
}

function __ZNSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351316);
}

function __ZNSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353204);
}

function __ZNSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351352);
}

function __ZL16always_availablePK22_mesa_glsl_parse_state($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1360972);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353384);
}

function __ZNSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351388);
}

function __ZNSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353408);
}

function __ZNSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351424);
}

function __ZNSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353432);
}

function __ZNSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351460);
}

function __ZNSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353456);
}

function __ZNSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351496);
}

function __ZNK9ir_rvalue15is_negative_oneEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361300);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__111__stdoutbufIwE4syncEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1190548);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__111__stdoutbufIcE4syncEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1190768);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__110__stdinbufIwE5uflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1343092);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__110__stdinbufIcE5uflowEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1343132);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK14ir_dereference9is_lvalueEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1242876);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_iidi(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = +a2;
 a3 = a3 | 0;
 return FUNCTION_TABLE_iidi[index & 1](a1 | 0, +a2, a3 | 0) | 0;
}

function __ZNSt3__112basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1338472);
}

function __ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1338508);
}

function __ZNKSt13runtime_error4whatEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1343924);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant8is_basisEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1067784);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK10ir_swizzle9is_lvalueEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1280920);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant7is_zeroEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1328128);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt11logic_error4whatEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1344228);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK9ir_rvalue9is_lvalueEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361608);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK11ir_constant6is_oneEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1328300);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function dynCall_viii(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 FUNCTION_TABLE_viii[index & 15](a1 | 0, a2 | 0, a3 | 0);
}

function __ZNK9ir_rvalue8is_basisEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361688);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK9ir_rvalue7is_zeroEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361788);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNKSt9bad_alloc4whatEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361352);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNK9ir_rvalue6is_oneEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361888);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function stackAlloc(size) {
 size = size | 0;
 var ret = 0;
 ret = STACKTOP;
 STACKTOP = STACKTOP + size | 0;
 STACKTOP = STACKTOP + 15 & -16;
 return ret | 0;
}

function __ZNKSt8bad_cast4whatEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361384);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN9glsl_type15record_key_hashEPKv($a) {
 $a = $a | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $a;
 emterpret(1175124);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function ___cxa_is_pointer_type($type) {
 $type = $type | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $type;
 emterpret(1316016);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZTv0_n12_NSt3__113basic_ostreamIwNS_11char_traitsIwEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1315640);
}

function __ZTv0_n12_NSt3__113basic_ostreamIwNS_11char_traitsIwEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1316912);
}

function __ZTv0_n12_NSt3__113basic_ostreamIcNS_11char_traitsIcEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1315696);
}

function __ZTv0_n12_NSt3__113basic_ostreamIcNS_11char_traitsIcEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1316964);
}

function __ZTv0_n12_NSt3__113basic_istreamIwNS_11char_traitsIwEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1315752);
}

function __ZTv0_n12_NSt3__113basic_istreamIwNS_11char_traitsIwEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1317016);
}

function __ZTv0_n12_NSt3__113basic_istreamIcNS_11char_traitsIcEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1315808);
}

function __ZTv0_n12_NSt3__113basic_istreamIcNS_11char_traitsIcEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1317068);
}

function _hash_table_pointer_hash($key) {
 $key = $key | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $key;
 emterpret(1353628);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function _hash_table_string_hash($key) {
 $key = $key | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $key;
 emterpret(1257464);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1337536);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1337592);
}

function __ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1333944);
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1337648);
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1337704);
}

function __ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1334012);
}

function __ZN12_GLOBAL__N_130ir_structure_splitting_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358912);
}

function __ZN12_GLOBAL__N_130ir_structure_splitting_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1355764);
}

function __ZNSt3__113basic_ostreamIwNS_11char_traitsIwEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342368);
}

function __ZNSt3__113basic_ostreamIwNS_11char_traitsIwEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1340340);
}

function __ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342408);
}

function __ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1340392);
}

function __ZNSt3__113basic_istreamIwNS_11char_traitsIwEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342448);
}

function __ZNSt3__113basic_istreamIwNS_11char_traitsIwEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1340444);
}

function __ZNSt3__113basic_istreamIcNS_11char_traitsIcEEED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342488);
}

function __ZNSt3__113basic_istreamIcNS_11char_traitsIcEEED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1340496);
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359252);
}

function __ZN12_GLOBAL__N_128ir_function_inlining_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1356592);
}

function _strlen(ptr) {
 ptr = ptr | 0;
 var curr = 0;
 curr = ptr;
 while (HEAP8[curr >> 0] | 0) {
  curr = curr + 1 | 0;
 }
 return curr - ptr | 0;
}

function __ZN12_GLOBAL__N_127ir_constant_folding_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359396);
}

function __ZN12_GLOBAL__N_127ir_constant_folding_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1356676);
}

function setThrew(threw, value) {
 threw = threw | 0;
 value = value | 0;
 if ((__THREW__ | 0) == 0) {
  __THREW__ = threw;
  threwValue = value;
 }
}

function __ZN12_GLOBAL__N_125geom_array_resize_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360012);
}

function __ZN12_GLOBAL__N_125geom_array_resize_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1356892);
}

function dynCall_iii(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 return FUNCTION_TABLE_iii[index & 511](a1 | 0, a2 | 0) | 0;
}

function __ZL17unpack_unorm_1x16t($u) {
 $u = $u | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $u;
 emterpret(1352828);
 return +HEAPF64[EMTSTACKTOP >> 3];
}

function __ZL17unpack_snorm_1x16t($u) {
 $u = $u | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $u;
 emterpret(1321304);
 return +HEAPF64[EMTSTACKTOP >> 3];
}

function __ZL16unpack_unorm_1x8h($u) {
 $u = $u | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $u;
 emterpret(1354880);
 return +HEAPF64[EMTSTACKTOP >> 3];
}

function __ZL16unpack_snorm_1x8h($u) {
 $u = $u | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $u;
 emterpret(1322076);
 return +HEAPF64[EMTSTACKTOP >> 3];
}

function __ZL16unpack_half_1x16t($u) {
 $u = $u | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $u;
 emterpret(1357748);
 return +HEAPF64[EMTSTACKTOP >> 3];
}

function __ZN12_GLOBAL__N_122ir_lower_jumps_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357168);
}

function __ZL15pack_unorm_1x16f($x) {
 $x = +$x;
 HEAPF64[EMTSTACKTOP + 0 >> 3] = $x;
 emterpret(1312488);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL15pack_snorm_1x16f($x) {
 $x = +$x;
 HEAPF64[EMTSTACKTOP + 0 >> 3] = $x;
 emterpret(1311232);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZN12_GLOBAL__N_121vector_insert_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352056);
}

function __ZN12_GLOBAL__N_121vector_insert_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1341772);
}

function __ZL14pack_unorm_1x8f($x) {
 $x = +$x;
 HEAPF64[EMTSTACKTOP + 0 >> 3] = $x;
 emterpret(1313744);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL14pack_snorm_1x8f($x) {
 $x = +$x;
 HEAPF64[EMTSTACKTOP + 0 >> 3] = $x;
 emterpret(1312916);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZL14pack_half_1x16f($x) {
 $x = +$x;
 HEAPF64[EMTSTACKTOP + 0 >> 3] = $x;
 emterpret(1357784);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function b7(p0, p1) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 HEAP32[EMTSTACKTOP + 8 >> 2] = p1;
 emterpret(1362400);
}

function __ZN12_GLOBAL__N_120ir_algebraic_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360568);
}

function __ZN12_GLOBAL__N_120ir_algebraic_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357456);
}

function __ZNSt3__16locale5facet16__on_zero_sharedEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1320004);
}

function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360664);
}

function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360688);
}

function __ZN10__cxxabiv121__vmi_class_type_infoD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357712);
}

function __ZN10__cxxabiv120__si_class_type_infoD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358040);
}

function __ZN31ir_variable_replacement_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360924);
}

function __ZN31ir_variable_replacement_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358172);
}

function __ZNSt3__17codecvtIDsc11__mbstate_tED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358288);
}

function __ZNSt3__17codecvtIDic11__mbstate_tED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358324);
}

function __ZNSt3__117__widen_from_utf8ILj32EED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358360);
}

function __ZNSt3__17codecvtIwc11__mbstate_tED2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1307340);
}

function __ZNSt3__17codecvtIwc11__mbstate_tED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1343272);
}

function __ZNSt3__17codecvtIcc11__mbstate_tED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358396);
}

function __ZNSt3__116__narrow_to_utf8ILj32EED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358432);
}

function __ZNK24ast_parameter_declarator5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1255188);
}

function __ZNK24ast_fully_specified_type5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1305268);
}

function __ZNK24ast_expression_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1287156);
}

function __ZN22_mesa_glsl_parse_state18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1360820);
}

function __ZN12_GLOBAL__N_115builtin_builderD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1341408);
}

function __ZN10__cxxabiv117__class_type_infoD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358584);
}

function __ZNK23ast_selection_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1221884);
}

function __ZNK23ast_iteration_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1074864);
}

function __ZNK23ast_function_definition5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1289212);
}

function __ZNK23ast_case_statement_list5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1257600);
}

function __ZN12_GLOBAL__N_18function18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1360948);
}

function __ZN10__cxxabiv116__shim_type_infoD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361144);
}

function dynCall_vii(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 FUNCTION_TABLE_vii[index & 255](a1 | 0, a2 | 0);
}

function __ZNK22ast_compound_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1249868);
}

function __ZN27ir_vector_splitting_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361204);
}

function __ZN27ir_vector_splitting_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358876);
}

function __ZN26ir_array_splitting_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361328);
}

function __ZN26ir_array_splitting_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358964);
}

function __ZN19loop_variable_state18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1353044);
}

function __ZNSt3__119__iostream_categoryD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359144);
}

function __ZNK20ast_switch_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1265468);
}

function __ZNK20ast_struct_specifier5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1213600);
}

function __ZN18symbol_table_entry18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1361096);
}

function __ZN18ast_type_qualifier18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1361120);
}

function __ZNK19ast_declarator_list5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1156832);
}

function __ZNK19ast_case_label_list5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1253080);
}

function __ZNK19ast_array_specifier5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1203120);
}

function __ZN17glsl_symbol_table18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1355728);
}

function __ZNSt3__110moneypunctIwLb1EED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361440);
}

function __ZNSt3__110moneypunctIwLb1EED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359444);
}

function __ZNSt3__110moneypunctIwLb0EED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361464);
}

function __ZNSt3__110moneypunctIwLb0EED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359480);
}

function __ZNSt3__110moneypunctIcLb1EED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361488);
}

function __ZNSt3__110moneypunctIcLb1EED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359516);
}

function __ZNSt3__110moneypunctIcLb0EED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361512);
}

function __ZNSt3__110moneypunctIcLb0EED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359552);
}

function __ZNK18ast_type_specifier5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1242236);
}

function __ZNK18ast_jump_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1226188);
}

function __ZNK18ast_expression_bin5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1249196);
}

function __ZNK18ast_case_statement5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1237672);
}

function __ZN23ir_dereference_variableD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357204);
}

function __ZN23ir_control_flow_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359732);
}

function __ZL10free_entryP10hash_entry($entry) {
 $entry = $entry | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $entry;
 emterpret(1333276);
}

function __ZN22ir_print_metal_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359976);
}

function __ZN22ir_precision_statementD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357420);
}

function __ZNSt3__18ios_base7failureD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1356556);
}

function __ZNSt3__18ios_base7failureD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1351748);
}

function __ZN21ir_typedecl_statementD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357568);
}

function __ZN21ir_print_glsl_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360188);
}

function __ZN21ir_function_signatureD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357604);
}

function __ZN21ir_dereference_recordD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357640);
}

function __ZN10__cxxabiv112_GLOBAL__N_19destruct_EPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1298236);
}

function __ZNSt3__114error_categoryD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361560);
}

function __ZNSt3__111__stdoutbufIwED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342528);
}

function __ZNSt3__111__stdoutbufIcED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342576);
}

function __ZNK15ast_switch_body5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1297176);
}

function __ZNK15ast_declaration5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1245276);
}

function __ZN20ir_dereference_arrayD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358004);
}

function __ZNSt3__16locale2id6__initEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1331456);
}

function __ZNSt3__110__stdinbufIwED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342904);
}

function __ZNSt3__110__stdinbufIcED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1342952);
}

function __ZNK14ast_case_label5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1264784);
}

function b9(p0) {
 p0 = p0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 emterpret(1362452);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__18ios_base4InitD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1301608);
}

function __ZNSt3__112system_errorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1357108);
}

function __ZNSt3__112system_errorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352384);
}

function __ZNK14ast_expression5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(863676);
}

function b19(p0) {
 p0 = +p0;
 HEAPF64[EMTSTACKTOP + 0 >> 3] = p0;
 emterpret(1362480);
 return HEAP32[EMTSTACKTOP >> 2] | 0;
}

function __ZNSt3__16locale5facetD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361764);
}

function __ZNSt3__16locale5facetD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360504);
}

function __ZNSt3__16locale5__impD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1191172);
}

function __ZNSt3__16locale5__impD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352212);
}

function __ZNK12ast_function5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1198292);
}

function b5(p0) {
 p0 = p0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 emterpret(1362424);
 return +HEAPF64[EMTSTACKTOP >> 3];
}

function __ZNSt3__18numpunctIwED2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1333336);
}

function __ZNSt3__18numpunctIwED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352496);
}

function __ZNSt3__18numpunctIcED2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1333392);
}

function __ZNSt3__18numpunctIcED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352544);
}

function __ZNSt3__18messagesIwED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361840);
}

function __ZNSt3__18messagesIwED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360592);
}

function __ZNSt3__18messagesIcED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361864);
}

function __ZNSt3__18messagesIcED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360628);
}

function __ZN16ir_end_primitiveD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1358672);
}

function __ZNSt3__17collateIwED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361916);
}

function __ZNSt3__17collateIwED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360748);
}

function __ZNSt3__17collateIcED1Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361940);
}

function __ZNSt3__17collateIcED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360784);
}

function __ZNSt13runtime_errorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1339376);
}

function __ZNSt13runtime_errorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1352756);
}

function __ZN9exec_node18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1361716);
}

function __ZN9exec_list18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1361740);
}

function __ZNSt12length_errorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353228);
}

function __ZN8ast_node18_ralloc_destructorEPv($p) {
 $p = $p | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $p;
 emterpret(1361816);
}

function __ZN14ir_instructionD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361964);
}

function __ZN14ir_emit_vertexD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359036);
}

function __ZN14ir_dereferenceD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359072);
}

function __ZNSt3__18ios_baseD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1272496);
}

function __ZNSt3__18ios_baseD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353336);
}

function __ZNSt3__15ctypeIcED2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1302332);
}

function __ZNSt3__15ctypeIcED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353480);
}

function __ZNSt11logic_errorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1339736);
}

function __ZNSt11logic_errorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1353528);
}

function __ZN14ir_instructionD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359e3);
}

function __ZN13ir_expressionD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359180);
}

function __ZN13ir_assignmentD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359216);
}

function __ZNSt3__15ctypeIwED0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361e3);
}

function __ZNK8ast_node5printEv($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1335800);
}

function __ZN12ir_loop_jumpD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359360);
}

function __ZN11ir_variableD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359768);
}

function __ZN11ir_functionD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359804);
}

function __ZN11ir_constantD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1359840);
}

function dynCall_ii(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return FUNCTION_TABLE_ii[index & 255](a1 | 0) | 0;
}

function __ZNSt9bad_allocD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1362072);
}

function __ZNSt9bad_allocD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361168);
}

function __ZN10ir_visitorD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1362096);
}

function __ZN10ir_visitorD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361228);
}

function __ZN10ir_textureD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360036);
}

function __ZN10ir_swizzleD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360072);
}

function __ZN10ir_discardD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360108);
}

function __ZNSt8bad_castD2Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1362120);
}

function __ZNSt8bad_castD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1361264);
}

function __ZN9ir_rvalueD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360224);
}

function __ZN9ir_returnD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360260);
}

function __ZN7ir_loopD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360360);
}

function __ZN7ir_jumpD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360396);
}

function __ZN7ir_callD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360432);
}

function dynCall_di(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return +FUNCTION_TABLE_di[index & 7](a1 | 0);
}

function ___cxx_global_array_dtor108($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1183836);
}

function __ZNSt3__112__do_nothingEPv($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1362176);
}

function ___cxx_global_array_dtor93($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1184544);
}

function ___cxx_global_array_dtor69($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1104284);
}

function ___cxx_global_array_dtor45($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1104748);
}

function ___cxx_global_array_dtor42($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1105212);
}

function __ZN5ir_ifD0Ev($this) {
 $this = $this | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $this;
 emterpret(1360712);
}

function dynCall_id(index, a1) {
 index = index | 0;
 a1 = +a1;
 return FUNCTION_TABLE_id[index & 7](+a1) | 0;
}

function ___cxx_global_array_dtor($0) {
 $0 = $0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = $0;
 emterpret(1105676);
}

function dynCall_vi(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 FUNCTION_TABLE_vi[index & 255](a1 | 0);
}

function b6(p0) {
 p0 = p0 | 0;
 HEAP32[EMTSTACKTOP + 0 >> 2] = p0;
 emterpret(1362508);
}

function dynCall_v(index) {
 index = index | 0;
 FUNCTION_TABLE_v[index & 7]();
}

function __ZN10__cxxabiv112_GLOBAL__N_110construct_Ev() {
 emterpret(1314332);
}

function __GLOBAL__sub_I_builtin_functions_cpp() {
 emterpret(1361064);
}

function setTempRet0(value) {
 value = value | 0;
 tempRet0 = value;
}

function __GLOBAL__sub_I_builtin_types_cpp() {
 emterpret(1021136);
}

function __ZL25default_terminate_handlerv() {
 emterpret(1093304);
}

function ___cxa_pure_virtual__wrapper() {
 emterpret(1362384);
}

function __GLOBAL__sub_I_iostream_cpp() {
 emterpret(1348712);
}

function stackRestore(top) {
 top = top | 0;
 STACKTOP = top;
}

function getTempRet0() {
 return tempRet0 | 0;
}

function stackSave() {
 return STACKTOP | 0;
}

function _autofree() {
 emterpret(1360844);
}

function b13() {
 emterpret(1362532);
}

// EMSCRIPTEN_END_FUNCS

var FUNCTION_TABLE_iiii = [b0,__ZN8ast_node3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN14ast_expression3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN23ast_function_expression3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN25ast_aggregate_initializer3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN19ast_interface_block3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN19ast_gs_input_layout3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN19ast_cs_input_layout3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN14ir_instruction6equalsEPS_12ir_node_type,__ZN18ast_type_specifier3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN22ast_compound_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN24ast_expression_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN12ast_function3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN19ast_declarator_list3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN18ast_jump_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN23ast_selection_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN20ast_switch_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN15ast_switch_body3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN14ast_case_label3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN19ast_case_label_list3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN18ast_case_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN23ast_case_statement_list3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN23ast_iteration_statement3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN20ast_struct_specifier3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN24ast_parameter_declarator3hirEP9exec_listP22_mesa_glsl_parse_state,__ZN23ast_function_definition3hirEP9exec_listP22_mesa_glsl_parse_state,__ZNK5ir_if5cloneEPvP10hash_table,__ZNK7ir_call5cloneEPvP10hash_table,__ZNK9ir_return5cloneEPvP10hash_table
,__ZNK12ir_loop_jump5cloneEPvP10hash_table,__ZNK10ir_discard5cloneEPvP10hash_table,__ZNK9ir_rvalue5cloneEPvP10hash_table,__ZNK10ir_texture5cloneEPvP10hash_table,__ZN10ir_texture6equalsEP14ir_instruction12ir_node_type,__ZNK22ir_precision_statement5cloneEPvP10hash_table,__ZNK21ir_typedecl_statement5cloneEPvP10hash_table,__ZNK11ir_constant5cloneEPvP10hash_table,__ZN11ir_constant6equalsEP14ir_instruction12ir_node_type,__ZNK23ir_dereference_variable5cloneEPvP10hash_table,__ZN23ir_dereference_variable6equalsEP14ir_instruction12ir_node_type,__ZNK21ir_function_signature5cloneEPvP10hash_table,__ZNK11ir_variable5cloneEPvP10hash_table,__ZNK11ir_function5cloneEPvP10hash_table,__ZNK7ir_loop5cloneEPvP10hash_table,__ZNK13ir_assignment5cloneEPvP10hash_table,__ZNK10ir_swizzle5cloneEPvP10hash_table,__ZN10ir_swizzle6equalsEP14ir_instruction12ir_node_type,__ZNK20ir_dereference_array5cloneEPvP10hash_table,__ZN20ir_dereference_array6equalsEP14ir_instruction12ir_node_type,__ZNK21ir_dereference_record5cloneEPvP10hash_table,__ZNK13ir_expression5cloneEPvP10hash_table,__ZN13ir_expression6equalsEP14ir_instruction12ir_node_type,__ZNK14ir_emit_vertex5cloneEPvP10hash_table,__ZNK16ir_end_primitive5cloneEPvP10hash_table,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6setbufEPwi,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6xsgetnEPwi,__ZNSt3__111__stdoutbufIwE6xsputnEPKwi,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6xsputnEPKwi,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6setbufEPci
,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6xsgetnEPci,__ZNSt3__111__stdoutbufIcE6xsputnEPKci,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6xsputnEPKci,__ZNKSt3__114error_category10equivalentEiRKNS_15error_conditionE,__ZNKSt3__114error_category10equivalentERKNS_10error_codeEi,__ZNKSt3__17collateIcE7do_hashEPKcS3_,__ZNKSt3__17collateIwE7do_hashEPKwS3_,__ZNKSt3__18messagesIcE7do_openERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERKNS_6localeE,__ZNKSt3__18messagesIwE7do_openERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERKNS_6localeE,__ZNKSt3__15ctypeIcE10do_toupperEPcPKc,__ZNKSt3__15ctypeIcE10do_tolowerEPcPKc,__ZNKSt3__15ctypeIcE9do_narrowEcc,__ZNKSt3__15ctypeIwE5do_isEtw,__ZNKSt3__15ctypeIwE10do_toupperEPwPKw,__ZNKSt3__15ctypeIwE10do_tolowerEPwPKw,__ZNKSt3__15ctypeIwE9do_narrowEwc,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,_sn_write,__mesa_new_shader,_do_read,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0];
var FUNCTION_TABLE_viiiiii = [b1,__ZN12_GLOBAL__N_111ubo_visitor11visit_fieldEPK9glsl_typePKcbS3_b,__ZN24program_resource_visitor11visit_fieldEPK9glsl_typePKcbS2_b,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE7seekoffExNS_8ios_base7seekdirEj,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE7seekoffExNS_8ios_base7seekdirEj,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcb,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcl,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcm,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcPKv,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwb,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwl,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwm,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwPKv,__ZNKSt3__18messagesIcE6do_getEiiiRKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE,__ZNKSt3__18messagesIwE6do_getEiiiRKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,__ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1];
var FUNCTION_TABLE_viiiii = [b2,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,__ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib];
var FUNCTION_TABLE_viiii = [b3,__ZN12_GLOBAL__N_111ubo_visitor11visit_fieldEPK9glsl_typePKcb,__ZN12_GLOBAL__N_116count_block_size11visit_fieldEPK9glsl_typePKcb,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE7seekposENS_4fposI11__mbstate_tEEj,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE7seekposENS_4fposI11__mbstate_tEEj,__ZNKSt3__17collateIcE12do_transformEPKcS3_,__ZNKSt3__17collateIwE12do_transformEPKwS3_,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,__ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b3,b3,b3,b3,b3,b3];
var FUNCTION_TABLE_viiiiiii = [b4,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRb,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRl,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRx,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRt,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjS8_,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRm,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRy,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRf,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRd,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRe,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRPv,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRb,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRl,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRx,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRt,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjS8_,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRm,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRy,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRf,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRd,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRe,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRPv,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcx,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcy,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwx,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwy,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_timeES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_dateES4_S4_RNS_8ios_baseERjP2tm
,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE14do_get_weekdayES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE16do_get_monthnameES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_yearES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_timeES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_dateES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE14do_get_weekdayES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE16do_get_monthnameES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_yearES4_S4_RNS_8ios_baseERjP2tm,__ZNKSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_bRNS_8ios_baseEcRKNS_12basic_stringIcS3_NS_9allocatorIcEEEE,__ZNKSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_bRNS_8ios_baseEwRKNS_12basic_stringIwS3_NS_9allocatorIwEEEE,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4];
var FUNCTION_TABLE_di = [b5,__ZL17unpack_snorm_1x16t,__ZL16unpack_snorm_1x8h,__ZL17unpack_unorm_1x16t,__ZL16unpack_unorm_1x8h,__ZL16unpack_half_1x16t,b5,b5];
var FUNCTION_TABLE_vi = [b6,__ZNK19ast_array_specifier5printEv,__ZNK18ast_expression_bin5printEv,__ZNK14ast_expression5printEv,__ZNK8ast_node5printEv,__ZN14ir_instructionD2Ev,__ZN7ir_jumpD0Ev,__ZNK18ast_type_specifier5printEv,__ZNK22ast_compound_statement5printEv,__ZNK24ast_expression_statement5printEv,__ZNK12ast_function5printEv,__ZNK15ast_declaration5printEv,__ZNK19ast_declarator_list5printEv,__ZNK18ast_jump_statement5printEv,__ZNK23ast_selection_statement5printEv,__ZNK20ast_switch_statement5printEv,__ZNK15ast_switch_body5printEv,__ZNK14ast_case_label5printEv,__ZNK19ast_case_label_list5printEv,__ZNK18ast_case_statement5printEv,__ZNK23ast_case_statement_list5printEv,__ZNK23ast_iteration_statement5printEv,__ZNK20ast_struct_specifier5printEv,__ZNK24ast_fully_specified_type5printEv,__ZNK24ast_parameter_declarator5printEv,__ZNK23ast_function_definition5printEv,__ZN14ir_dereferenceD0Ev,__ZN5ir_ifD0Ev,__ZN7ir_callD0Ev
,__ZN9ir_returnD0Ev,__ZN12ir_loop_jumpD0Ev,__ZN10ir_discardD0Ev,__ZN9ir_rvalueD0Ev,__ZN10ir_textureD0Ev,__ZN22ir_precision_statementD0Ev,__ZN21ir_typedecl_statementD0Ev,__ZN11ir_constantD0Ev,__ZN23ir_dereference_variableD0Ev,__ZN21ir_function_signatureD0Ev,__ZN11ir_variableD0Ev,__ZN11ir_functionD0Ev,__ZN7ir_loopD0Ev,__ZN13ir_assignmentD0Ev,__ZN10ir_swizzleD0Ev,__ZN20ir_dereference_arrayD0Ev,__ZN21ir_dereference_recordD0Ev,__ZN14ir_instructionD0Ev,__ZN13ir_expressionD0Ev,__ZN14ir_emit_vertexD0Ev,__ZN16ir_end_primitiveD0Ev,__ZN10ir_visitorD2Ev,__ZN21ir_print_glsl_visitorD0Ev,__ZN10ir_visitorD0Ev,__ZN22ir_print_metal_visitorD0Ev,__ZN12_GLOBAL__N_125geom_array_resize_visitorD2Ev,__ZN12_GLOBAL__N_125geom_array_resize_visitorD0Ev,__ZN12_GLOBAL__N_122ir_lower_jumps_visitorD0Ev,__ZN23ir_control_flow_visitorD0Ev,__ZN12_GLOBAL__N_121vector_insert_visitorD2Ev
,__ZN12_GLOBAL__N_121vector_insert_visitorD0Ev,__ZN12_GLOBAL__N_120ir_algebraic_visitorD2Ev,__ZN12_GLOBAL__N_120ir_algebraic_visitorD0Ev,__ZN26ir_array_splitting_visitorD2Ev,__ZN26ir_array_splitting_visitorD0Ev,__ZN12_GLOBAL__N_127ir_constant_folding_visitorD2Ev,__ZN12_GLOBAL__N_127ir_constant_folding_visitorD0Ev,__ZN31ir_variable_replacement_visitorD2Ev,__ZN31ir_variable_replacement_visitorD0Ev,__ZN12_GLOBAL__N_128ir_function_inlining_visitorD2Ev,__ZN12_GLOBAL__N_128ir_function_inlining_visitorD0Ev,__ZN12_GLOBAL__N_130ir_structure_splitting_visitorD2Ev,__ZN12_GLOBAL__N_130ir_structure_splitting_visitorD0Ev,__ZN27ir_vector_splitting_visitorD2Ev,__ZN27ir_vector_splitting_visitorD0Ev,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED2Ev,__ZNSt3__111__stdoutbufIwED0Ev,__ZNSt3__110__stdinbufIwED0Ev,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED2Ev,__ZNSt3__111__stdoutbufIcED0Ev,__ZNSt3__110__stdinbufIcED0Ev,__ZNSt3__112system_errorD2Ev,__ZNSt3__112system_errorD0Ev,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED1Ev,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED0Ev,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED1Ev,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED0Ev,__ZNSt3__113basic_istreamIcNS_11char_traitsIcEEED1Ev,__ZNSt3__113basic_istreamIcNS_11char_traitsIcEEED0Ev,__ZTv0_n12_NSt3__113basic_istreamIcNS_11char_traitsIcEEED1Ev
,__ZTv0_n12_NSt3__113basic_istreamIcNS_11char_traitsIcEEED0Ev,__ZNSt3__113basic_istreamIwNS_11char_traitsIwEEED1Ev,__ZNSt3__113basic_istreamIwNS_11char_traitsIwEEED0Ev,__ZTv0_n12_NSt3__113basic_istreamIwNS_11char_traitsIwEEED1Ev,__ZTv0_n12_NSt3__113basic_istreamIwNS_11char_traitsIwEEED0Ev,__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEED1Ev,__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEED0Ev,__ZTv0_n12_NSt3__113basic_ostreamIcNS_11char_traitsIcEEED1Ev,__ZTv0_n12_NSt3__113basic_ostreamIcNS_11char_traitsIcEEED0Ev,__ZNSt3__113basic_ostreamIwNS_11char_traitsIwEEED1Ev,__ZNSt3__113basic_ostreamIwNS_11char_traitsIwEEED0Ev,__ZTv0_n12_NSt3__113basic_ostreamIwNS_11char_traitsIwEEED1Ev,__ZTv0_n12_NSt3__113basic_ostreamIwNS_11char_traitsIwEEED0Ev,__ZNSt3__18ios_base7failureD2Ev,__ZNSt3__18ios_base7failureD0Ev,__ZNSt3__18ios_baseD2Ev,__ZNSt3__18ios_baseD0Ev,__ZNSt3__114error_categoryD2Ev,__ZNSt3__119__iostream_categoryD0Ev,__ZNSt3__17collateIcED1Ev,__ZNSt3__17collateIcED0Ev,__ZNSt3__16locale5facet16__on_zero_sharedEv,__ZNSt3__17collateIwED1Ev,__ZNSt3__17collateIwED0Ev,__ZNSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,__ZNSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,__ZNSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,__ZNSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,__ZNSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,__ZNSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev
,__ZNSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,__ZNSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,__ZNSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,__ZNSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,__ZNSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,__ZNSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,__ZNSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,__ZNSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,__ZNSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,__ZNSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,__ZNSt3__110moneypunctIcLb0EED1Ev,__ZNSt3__110moneypunctIcLb0EED0Ev,__ZNSt3__110moneypunctIcLb1EED1Ev,__ZNSt3__110moneypunctIcLb1EED0Ev,__ZNSt3__110moneypunctIwLb0EED1Ev,__ZNSt3__110moneypunctIwLb0EED0Ev,__ZNSt3__110moneypunctIwLb1EED1Ev,__ZNSt3__110moneypunctIwLb1EED0Ev,__ZNSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,__ZNSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,__ZNSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,__ZNSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,__ZNSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,__ZNSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,__ZNSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,__ZNSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,__ZNSt3__18messagesIcED1Ev,__ZNSt3__18messagesIcED0Ev,__ZNSt3__18messagesIwED1Ev,__ZNSt3__18messagesIwED0Ev
,__ZNSt3__16locale5__impD2Ev,__ZNSt3__16locale5__impD0Ev,__ZNSt3__15ctypeIcED2Ev,__ZNSt3__15ctypeIcED0Ev,__ZNSt3__17codecvtIwc11__mbstate_tED2Ev,__ZNSt3__17codecvtIwc11__mbstate_tED0Ev,__ZNSt3__18numpunctIcED2Ev,__ZNSt3__18numpunctIcED0Ev,__ZNSt3__18numpunctIwED2Ev,__ZNSt3__18numpunctIwED0Ev,__ZNSt3__16locale5facetD2Ev,__ZNSt3__16locale5facetD0Ev,__ZNSt3__15ctypeIwED0Ev,__ZNSt3__17codecvtIcc11__mbstate_tED0Ev,__ZNSt3__17codecvtIDsc11__mbstate_tED0Ev,__ZNSt3__17codecvtIDic11__mbstate_tED0Ev,__ZNSt3__116__narrow_to_utf8ILj32EED0Ev,__ZNSt3__117__widen_from_utf8ILj32EED0Ev,__ZNSt9bad_allocD2Ev,__ZNSt9bad_allocD0Ev,__ZNSt11logic_errorD2Ev,__ZNSt11logic_errorD0Ev,__ZNSt13runtime_errorD2Ev,__ZNSt13runtime_errorD0Ev,__ZNSt12length_errorD0Ev,__ZNSt8bad_castD2Ev,__ZNSt8bad_castD0Ev,__ZN10__cxxabiv116__shim_type_infoD2Ev,__ZN10__cxxabiv117__class_type_infoD0Ev,__ZNK10__cxxabiv116__shim_type_info5noop1Ev
,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,__ZN10__cxxabiv120__si_class_type_infoD0Ev,__ZN10__cxxabiv121__vmi_class_type_infoD0Ev,__ZN9exec_node18_ralloc_destructorEPv,__ZN8ast_node18_ralloc_destructorEPv,__ZN12_GLOBAL__N_115builtin_builderD2Ev,__ZN17glsl_symbol_table18_ralloc_destructorEPv,__ZN22_mesa_glsl_parse_state18_ralloc_destructorEPv,__ZN9exec_list18_ralloc_destructorEPv,__ZN18ast_type_qualifier18_ralloc_destructorEPv,__ZN18symbol_table_entry18_ralloc_destructorEPv,__ZN12_GLOBAL__N_18function18_ralloc_destructorEPv,__ZL10free_entryP10hash_entry,__ZN19loop_variable_state18_ralloc_destructorEPv,__ZNSt3__112__do_nothingEPv,__ZNSt3__16locale2id6__initEv,__ZNSt3__117__call_once_proxyINS_5tupleIJNS_12_GLOBAL__N_111__fake_bindEEEEEEvPv,___cxx_global_array_dtor108,___cxx_global_array_dtor93,___cxx_global_array_dtor69,___cxx_global_array_dtor45,___cxx_global_array_dtor42,___cxx_global_array_dtor,__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev,__ZNSt3__112basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED1Ev,__ZNSt3__18ios_base4InitD2Ev,_free,__ZN10__cxxabiv112_GLOBAL__N_19destruct_EPv,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6];
var FUNCTION_TABLE_vii = [b7,__ZN9ir_rvalue6acceptEP10ir_visitor,__ZN5ir_if6acceptEP10ir_visitor,__ZN7ir_call6acceptEP10ir_visitor,__ZN9ir_return6acceptEP10ir_visitor,__ZN12ir_loop_jump6acceptEP10ir_visitor,__ZN10ir_discard6acceptEP10ir_visitor,__ZN10ir_texture6acceptEP10ir_visitor,__ZN22ir_precision_statement6acceptEP10ir_visitor,__ZN21ir_typedecl_statement6acceptEP10ir_visitor,__ZN11ir_constant6acceptEP10ir_visitor,__ZN23ir_dereference_variable6acceptEP10ir_visitor,__ZN21ir_function_signature6acceptEP10ir_visitor,__ZN11ir_variable6acceptEP10ir_visitor,__ZN11ir_function6acceptEP10ir_visitor,__ZN7ir_loop6acceptEP10ir_visitor,__ZN13ir_assignment6acceptEP10ir_visitor,__ZN10ir_swizzle6acceptEP10ir_visitor,__ZN20ir_dereference_array6acceptEP10ir_visitor,__ZN21ir_dereference_record6acceptEP10ir_visitor,__ZN13ir_expression6acceptEP10ir_visitor,__ZN14ir_emit_vertex6acceptEP10ir_visitor,__ZN16ir_end_primitive6acceptEP10ir_visitor,__ZN10ir_visitor5visitEP9ir_rvalue,__ZN21ir_print_glsl_visitor5visitEP11ir_variable,__ZN21ir_print_glsl_visitor5visitEP21ir_function_signature,__ZN21ir_print_glsl_visitor5visitEP11ir_function,__ZN21ir_print_glsl_visitor5visitEP13ir_expression,__ZN21ir_print_glsl_visitor5visitEP10ir_texture
,__ZN21ir_print_glsl_visitor5visitEP10ir_swizzle,__ZN21ir_print_glsl_visitor5visitEP23ir_dereference_variable,__ZN21ir_print_glsl_visitor5visitEP20ir_dereference_array,__ZN21ir_print_glsl_visitor5visitEP21ir_dereference_record,__ZN21ir_print_glsl_visitor5visitEP13ir_assignment,__ZN21ir_print_glsl_visitor5visitEP11ir_constant,__ZN21ir_print_glsl_visitor5visitEP7ir_call,__ZN21ir_print_glsl_visitor5visitEP9ir_return,__ZN21ir_print_glsl_visitor5visitEP10ir_discard,__ZN21ir_print_glsl_visitor5visitEP5ir_if,__ZN21ir_print_glsl_visitor5visitEP7ir_loop,__ZN21ir_print_glsl_visitor5visitEP12ir_loop_jump,__ZN21ir_print_glsl_visitor5visitEP22ir_precision_statement,__ZN21ir_print_glsl_visitor5visitEP21ir_typedecl_statement,__ZN21ir_print_glsl_visitor5visitEP14ir_emit_vertex,__ZN21ir_print_glsl_visitor5visitEP16ir_end_primitive,__ZN22ir_print_metal_visitor5visitEP11ir_variable,__ZN22ir_print_metal_visitor5visitEP21ir_function_signature,__ZN22ir_print_metal_visitor5visitEP11ir_function,__ZN22ir_print_metal_visitor5visitEP13ir_expression,__ZN22ir_print_metal_visitor5visitEP10ir_texture,__ZN22ir_print_metal_visitor5visitEP10ir_swizzle,__ZN22ir_print_metal_visitor5visitEP23ir_dereference_variable,__ZN22ir_print_metal_visitor5visitEP20ir_dereference_array,__ZN22ir_print_metal_visitor5visitEP21ir_dereference_record,__ZN22ir_print_metal_visitor5visitEP13ir_assignment,__ZN22ir_print_metal_visitor5visitEP11ir_constant,__ZN22ir_print_metal_visitor5visitEP7ir_call,__ZN22ir_print_metal_visitor5visitEP9ir_return,__ZN22ir_print_metal_visitor5visitEP10ir_discard
,__ZN22ir_print_metal_visitor5visitEP5ir_if,__ZN22ir_print_metal_visitor5visitEP7ir_loop,__ZN22ir_print_metal_visitor5visitEP12ir_loop_jump,__ZN22ir_print_metal_visitor5visitEP22ir_precision_statement,__ZN22ir_print_metal_visitor5visitEP21ir_typedecl_statement,__ZN22ir_print_metal_visitor5visitEP14ir_emit_vertex,__ZN22ir_print_metal_visitor5visitEP16ir_end_primitive,__ZN12_GLOBAL__N_111ubo_visitor11visit_fieldEPK17glsl_struct_field,__ZN24program_resource_visitor11visit_fieldEPK17glsl_struct_field,__ZN23ir_control_flow_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP21ir_function_signature,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP11ir_function,__ZN23ir_control_flow_visitor5visitEP13ir_expression,__ZN23ir_control_flow_visitor5visitEP10ir_texture,__ZN23ir_control_flow_visitor5visitEP10ir_swizzle,__ZN23ir_control_flow_visitor5visitEP23ir_dereference_variable,__ZN23ir_control_flow_visitor5visitEP20ir_dereference_array,__ZN23ir_control_flow_visitor5visitEP21ir_dereference_record,__ZN23ir_control_flow_visitor5visitEP13ir_assignment,__ZN23ir_control_flow_visitor5visitEP11ir_constant,__ZN23ir_control_flow_visitor5visitEP7ir_call,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP9ir_return,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP10ir_discard,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP5ir_if,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP7ir_loop,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP12ir_loop_jump,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP22ir_precision_statement,__ZN12_GLOBAL__N_122ir_lower_jumps_visitor5visitEP21ir_typedecl_statement,__ZN23ir_control_flow_visitor5visitEP14ir_emit_vertex,__ZN23ir_control_flow_visitor5visitEP16ir_end_primitive
,__ZN12_GLOBAL__N_121vector_insert_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_120ir_algebraic_visitor13handle_rvalueEPP9ir_rvalue,__ZN26ir_array_splitting_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_127ir_constant_folding_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_111cse_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_123contains_rvalue_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_117ir_minmax_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_123ir_noop_swizzle_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_120ir_rebalance_visitor13handle_rvalueEPP9ir_rvalue,__ZN12_GLOBAL__N_130ir_structure_splitting_visitor13handle_rvalueEPP9ir_rvalue,__ZN27ir_vector_splitting_visitor13handle_rvalueEPP9ir_rvalue,__ZNSt3__111__stdoutbufIwE5imbueERKNS_6localeE,__ZNSt3__110__stdinbufIwE5imbueERKNS_6localeE,__ZNSt3__111__stdoutbufIcE5imbueERKNS_6localeE,__ZNSt3__110__stdinbufIcE5imbueERKNS_6localeE,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE5imbueERKNS_6localeE,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE5imbueERKNS_6localeE,__ZNKSt3__110moneypunctIcLb0EE11do_groupingEv,__ZNKSt3__110moneypunctIcLb0EE14do_curr_symbolEv,__ZNKSt3__110moneypunctIcLb0EE16do_positive_signEv,__ZNKSt3__110moneypunctIcLb0EE16do_negative_signEv,__ZNKSt3__110moneypunctIcLb0EE13do_pos_formatEv,__ZNKSt3__110moneypunctIcLb0EE13do_neg_formatEv,__ZNKSt3__110moneypunctIcLb1EE11do_groupingEv,__ZNKSt3__110moneypunctIcLb1EE14do_curr_symbolEv,__ZNKSt3__110moneypunctIcLb1EE16do_positive_signEv,__ZNKSt3__110moneypunctIcLb1EE16do_negative_signEv,__ZNKSt3__110moneypunctIcLb1EE13do_pos_formatEv
,__ZNKSt3__110moneypunctIcLb1EE13do_neg_formatEv,__ZNKSt3__110moneypunctIwLb0EE11do_groupingEv,__ZNKSt3__110moneypunctIwLb0EE14do_curr_symbolEv,__ZNKSt3__110moneypunctIwLb0EE16do_positive_signEv,__ZNKSt3__110moneypunctIwLb0EE16do_negative_signEv,__ZNKSt3__110moneypunctIwLb0EE13do_pos_formatEv,__ZNKSt3__110moneypunctIwLb0EE13do_neg_formatEv,__ZNKSt3__110moneypunctIwLb1EE11do_groupingEv,__ZNKSt3__110moneypunctIwLb1EE14do_curr_symbolEv,__ZNKSt3__110moneypunctIwLb1EE16do_positive_signEv,__ZNKSt3__110moneypunctIwLb1EE16do_negative_signEv,__ZNKSt3__110moneypunctIwLb1EE13do_pos_formatEv,__ZNKSt3__110moneypunctIwLb1EE13do_neg_formatEv,__ZNKSt3__18messagesIcE8do_closeEi,__ZNKSt3__18messagesIwE8do_closeEi,__ZNKSt3__18numpunctIcE11do_groupingEv,__ZNKSt3__18numpunctIcE11do_truenameEv,__ZNKSt3__18numpunctIcE12do_falsenameEv,__ZNKSt3__18numpunctIwE11do_groupingEv,__ZNKSt3__18numpunctIwE11do_truenameEv,__ZNKSt3__18numpunctIwE12do_falsenameEv,__ZL12DeleteShaderP10gl_contextP9gl_shader,__ZL25propagate_precision_derefP14ir_instructionPv,__ZL26propagate_precision_assignP14ir_instructionPv,__ZL24propagate_precision_callP14ir_instructionPv,__ZL24propagate_precision_exprP14ir_instructionPv,__ZL40has_only_undefined_precision_assignmentsP14ir_instructionPv,__ZL14visit_variableP14ir_instructionPv,__ZL30replace_return_with_assignmentP14ir_instructionPv,__ZL12update_typesP14ir_instructionPv
,__ZL12is_reductionP14ir_instructionPv,__ZN12_GLOBAL__N_130dereferences_variable_callbackEP14ir_instructionPv,__ZL15rewrite_swizzleP14ir_instructionPv,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7];
var FUNCTION_TABLE_viiiiiiiii = [b8,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjP2tmcc,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjP2tmcc,b8];
var FUNCTION_TABLE_ii = [b9,__ZNK14ir_dereference9is_lvalueEv,__ZN9ir_rvalue25whole_variable_referencedEv,__ZNK9ir_rvalue7is_zeroEv,__ZNK9ir_rvalue6is_oneEv,__ZNK9ir_rvalue15is_negative_oneEv,__ZNK9ir_rvalue8is_basisEv,__ZNK9ir_rvalue18is_uint16_constantEv,__ZNK9ir_rvalue9is_lvalueEv,__ZNK9ir_rvalue19variable_referencedEv,__ZNK11ir_constant7is_zeroEv,__ZNK11ir_constant6is_oneEv,__ZNK11ir_constant15is_negative_oneEv,__ZNK11ir_constant8is_basisEv,__ZNK11ir_constant18is_uint16_constantEv,__ZNK23ir_dereference_variable19variable_referencedEv,__ZN23ir_dereference_variable25whole_variable_referencedEv,__ZNK10ir_swizzle9is_lvalueEv,__ZNK10ir_swizzle19variable_referencedEv,__ZNK20ir_dereference_array19variable_referencedEv,__ZNK21ir_dereference_record19variable_referencedEv,__ZNSt3__111__stdoutbufIwE4syncEv,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9showmanycEv,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9underflowEv,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE5uflowEv,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE4syncEv,__ZNSt3__110__stdinbufIwE9underflowEv,__ZNSt3__110__stdinbufIwE5uflowEv,__ZNSt3__111__stdoutbufIcE4syncEv
,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9showmanycEv,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9underflowEv,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE5uflowEv,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE4syncEv,__ZNSt3__110__stdinbufIcE9underflowEv,__ZNSt3__110__stdinbufIcE5uflowEv,__ZNKSt13runtime_error4whatEv,__ZNKSt3__119__iostream_category4nameEv,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE13do_date_orderEv,__ZNKSt3__120__time_get_c_storageIcE7__weeksEv,__ZNKSt3__120__time_get_c_storageIcE8__monthsEv,__ZNKSt3__120__time_get_c_storageIcE7__am_pmEv,__ZNKSt3__120__time_get_c_storageIcE3__cEv,__ZNKSt3__120__time_get_c_storageIcE3__rEv,__ZNKSt3__120__time_get_c_storageIcE3__xEv,__ZNKSt3__120__time_get_c_storageIcE3__XEv,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE13do_date_orderEv,__ZNKSt3__120__time_get_c_storageIwE7__weeksEv,__ZNKSt3__120__time_get_c_storageIwE8__monthsEv,__ZNKSt3__120__time_get_c_storageIwE7__am_pmEv,__ZNKSt3__120__time_get_c_storageIwE3__cEv,__ZNKSt3__120__time_get_c_storageIwE3__rEv,__ZNKSt3__120__time_get_c_storageIwE3__xEv,__ZNKSt3__120__time_get_c_storageIwE3__XEv,__ZNKSt3__110moneypunctIcLb0EE16do_decimal_pointEv,__ZNKSt3__110moneypunctIcLb0EE16do_thousands_sepEv,__ZNKSt3__110moneypunctIcLb0EE14do_frac_digitsEv,__ZNKSt3__110moneypunctIcLb1EE16do_decimal_pointEv,__ZNKSt3__110moneypunctIcLb1EE16do_thousands_sepEv,__ZNKSt3__110moneypunctIcLb1EE14do_frac_digitsEv
,__ZNKSt3__110moneypunctIwLb0EE16do_decimal_pointEv,__ZNKSt3__110moneypunctIwLb0EE16do_thousands_sepEv,__ZNKSt3__110moneypunctIwLb0EE14do_frac_digitsEv,__ZNKSt3__110moneypunctIwLb1EE16do_decimal_pointEv,__ZNKSt3__110moneypunctIwLb1EE16do_thousands_sepEv,__ZNKSt3__110moneypunctIwLb1EE14do_frac_digitsEv,__ZNKSt3__17codecvtIwc11__mbstate_tE11do_encodingEv,__ZNKSt3__17codecvtIwc11__mbstate_tE16do_always_noconvEv,__ZNKSt3__17codecvtIwc11__mbstate_tE13do_max_lengthEv,__ZNKSt3__18numpunctIcE16do_decimal_pointEv,__ZNKSt3__18numpunctIcE16do_thousands_sepEv,__ZNKSt3__18numpunctIwE16do_decimal_pointEv,__ZNKSt3__18numpunctIwE16do_thousands_sepEv,__ZNKSt3__17codecvtIcc11__mbstate_tE11do_encodingEv,__ZNKSt3__17codecvtIcc11__mbstate_tE16do_always_noconvEv,__ZNKSt3__17codecvtIcc11__mbstate_tE13do_max_lengthEv,__ZNKSt3__17codecvtIDsc11__mbstate_tE11do_encodingEv,__ZNKSt3__17codecvtIDsc11__mbstate_tE16do_always_noconvEv,__ZNKSt3__17codecvtIDsc11__mbstate_tE13do_max_lengthEv,__ZNKSt3__17codecvtIDic11__mbstate_tE11do_encodingEv,__ZNKSt3__17codecvtIDic11__mbstate_tE16do_always_noconvEv,__ZNKSt3__17codecvtIDic11__mbstate_tE13do_max_lengthEv,__ZNKSt9bad_alloc4whatEv,__ZNKSt11logic_error4whatEv,__ZNKSt8bad_cast4whatEv,_hash_table_string_hash,_hash_table_pointer_hash,__ZL16always_availablePK22_mesa_glsl_parse_state,__ZL4v130PK22_mesa_glsl_parse_state,__ZL18shader_integer_mixPK22_mesa_glsl_parse_state
,__ZL22texture_cube_map_arrayPK22_mesa_glsl_parse_state,__ZL4v140PK22_mesa_glsl_parse_state,__ZL19texture_multisamplePK22_mesa_glsl_parse_state,__ZL12v130_fs_onlyPK22_mesa_glsl_parse_state,__ZL25fs_texture_cube_map_arrayPK22_mesa_glsl_parse_state,__ZL4v110PK22_mesa_glsl_parse_state,__ZL12v110_fs_onlyPK22_mesa_glsl_parse_state,__ZL13texture_arrayPK22_mesa_glsl_parse_state,__ZL16fs_texture_arrayPK22_mesa_glsl_parse_state,__ZL9tex1d_lodPK22_mesa_glsl_parse_state,__ZL17texture_array_lodPK22_mesa_glsl_parse_state,__ZL7fs_onlyPK22_mesa_glsl_parse_state,__ZL16texture_externalPK22_mesa_glsl_parse_state,__ZL19lod_exists_in_stagePK22_mesa_glsl_parse_state,__ZL5tex3dPK22_mesa_glsl_parse_state,__ZL8fs_tex3dPK22_mesa_glsl_parse_state,__ZL9tex3d_lodPK22_mesa_glsl_parse_state,__ZL17texture_rectanglePK22_mesa_glsl_parse_state,__ZL22es_lod_exists_in_stagePK22_mesa_glsl_parse_state,__ZL18es_shadow_samplersPK22_mesa_glsl_parse_state,__ZL8v110_lodPK22_mesa_glsl_parse_state,__ZL18shader_texture_lodPK22_mesa_glsl_parse_state,__ZL21es_shader_texture_lodPK22_mesa_glsl_parse_state,__ZL27shader_texture_lod_and_rectPK22_mesa_glsl_parse_state,__ZL14texture_gatherPK22_mesa_glsl_parse_state,__ZL11gpu_shader5PK22_mesa_glsl_parse_state,__ZL19texture_gather_onlyPK22_mesa_glsl_parse_state,__ZL22shader_atomic_countersPK22_mesa_glsl_parse_state,__ZL23shader_image_load_storePK22_mesa_glsl_parse_state,__ZL19shader_bit_encodingPK22_mesa_glsl_parse_state
,__ZL36shader_packing_or_es3_or_gpu_shader5PK22_mesa_glsl_parse_state,__ZL21shader_packing_or_es3PK22_mesa_glsl_parse_state,__ZL29shader_packing_or_gpu_shader5PK22_mesa_glsl_parse_state,__ZL21compatibility_vs_onlyPK22_mesa_glsl_parse_state,__ZL4v120PK22_mesa_glsl_parse_state,__ZL7gs_onlyPK22_mesa_glsl_parse_state,__ZL10gs_streamsPK22_mesa_glsl_parse_state,__ZL17texture_query_lodPK22_mesa_glsl_parse_state,__ZL20texture_query_levelsPK22_mesa_glsl_parse_state,__ZL18fs_oes_derivativesPK22_mesa_glsl_parse_state,__ZL21fs_derivative_controlPK22_mesa_glsl_parse_state,__ZL14fs_gpu_shader5PK22_mesa_glsl_parse_state,__ZL21shader_trinary_minmaxPK22_mesa_glsl_parse_state,__ZN9glsl_type15record_key_hashEPKv,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9];
var FUNCTION_TABLE_viiiiiid = [b10,__ZNKSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_bRNS_8ios_baseEce,__ZNKSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_bRNS_8ios_baseEwe,b10];
var FUNCTION_TABLE_viii = [b11,__ZN14ast_expression13hir_no_rvalueEP9exec_listP22_mesa_glsl_parse_state,__ZN23ast_function_expression13hir_no_rvalueEP9exec_listP22_mesa_glsl_parse_state,__ZN25ast_aggregate_initializer13hir_no_rvalueEP9exec_listP22_mesa_glsl_parse_state,__ZNKSt3__114error_category23default_error_conditionEi,__ZNKSt3__119__iostream_category7messageEi,__ZL25remove_unlinked_functionsPKvPvS1_,__ZL20emit_errors_unlinkedPKvPvS1_,__ZN20array_sizing_visitor28fixup_unnamed_interface_typeEPKvPvS2_,__ZL27dead_code_local_basic_blockP14ir_instructionS0_Pv,__ZN12_GLOBAL__N_1L25tree_grafting_basic_blockEP14ir_instructionS1_Pv,b11,b11,b11,b11,b11];
var FUNCTION_TABLE_viiiiid = [b12,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcd,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEce,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwd,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwe,b12,b12,b12];
var FUNCTION_TABLE_v = [b13,___cxa_pure_virtual__wrapper,__ZL25default_terminate_handlerv,_autofree,__ZN10__cxxabiv112_GLOBAL__N_110construct_Ev,b13,b13,b13];
var FUNCTION_TABLE_iiiiiiiii = [b14,__ZNKSt3__17codecvtIwc11__mbstate_tE6do_outERS1_PKwS5_RS5_PcS7_RS7_,__ZNKSt3__17codecvtIwc11__mbstate_tE5do_inERS1_PKcS5_RS5_PwS7_RS7_,__ZNKSt3__17codecvtIcc11__mbstate_tE6do_outERS1_PKcS5_RS5_PcS7_RS7_,__ZNKSt3__17codecvtIcc11__mbstate_tE5do_inERS1_PKcS5_RS5_PcS7_RS7_,__ZNKSt3__17codecvtIDsc11__mbstate_tE6do_outERS1_PKDsS5_RS5_PcS7_RS7_,__ZNKSt3__17codecvtIDsc11__mbstate_tE5do_inERS1_PKcS5_RS5_PDsS7_RS7_,__ZNKSt3__17codecvtIDic11__mbstate_tE6do_outERS1_PKDiS5_RS5_PcS7_RS7_,__ZNKSt3__17codecvtIDic11__mbstate_tE5do_inERS1_PKcS5_RS5_PDiS7_RS7_,b14,b14,b14,b14,b14,b14,b14];
var FUNCTION_TABLE_iiiii = [b15,__ZNKSt3__15ctypeIcE8do_widenEPKcS3_Pc,__ZNKSt3__15ctypeIwE5do_isEPKwS3_Pt,__ZNKSt3__15ctypeIwE10do_scan_isEtPKwS3_,__ZNKSt3__15ctypeIwE11do_scan_notEtPKwS3_,__ZNKSt3__15ctypeIwE8do_widenEPKcS3_Pw,b15,b15];
var FUNCTION_TABLE_viiiiiiii = [b16,__ZNKSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcPK2tmcc,__ZNKSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwPK2tmcc,__ZNKSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_bRNS_8ios_baseERjRe,__ZNKSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_bRNS_8ios_baseERjRNS_12basic_stringIcS3_NS_9allocatorIcEEEE,__ZNKSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_bRNS_8ios_baseERjRe,__ZNKSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_bRNS_8ios_baseERjRNS_12basic_stringIwS3_NS_9allocatorIwEEEE,b16];
var FUNCTION_TABLE_iidi = [b17,__ZNK11ir_constant8is_valueEfi];
var FUNCTION_TABLE_iii = [b18,__ZN23ir_hierarchical_visitor5visitEP9ir_rvalue,__ZN23ir_hierarchical_visitor5visitEP11ir_variable,__ZN23ir_hierarchical_visitor5visitEP11ir_constant,__ZN23ir_hierarchical_visitor5visitEP12ir_loop_jump,__ZN23ir_hierarchical_visitor5visitEP22ir_precision_statement,__ZN23ir_hierarchical_visitor5visitEP21ir_typedecl_statement,__ZN29interface_block_usage_visitor5visitEP23ir_dereference_variable,__ZN23ir_hierarchical_visitor11visit_enterEP7ir_loop,__ZN23ir_hierarchical_visitor11visit_leaveEP7ir_loop,__ZN23ir_hierarchical_visitor11visit_enterEP21ir_function_signature,__ZN23ir_hierarchical_visitor11visit_leaveEP21ir_function_signature,__ZN23ir_hierarchical_visitor11visit_enterEP11ir_function,__ZN23ir_hierarchical_visitor11visit_leaveEP11ir_function,__ZN23ir_hierarchical_visitor11visit_enterEP13ir_expression,__ZN23ir_hierarchical_visitor11visit_leaveEP13ir_expression,__ZN23ir_hierarchical_visitor11visit_enterEP10ir_texture,__ZN23ir_hierarchical_visitor11visit_leaveEP10ir_texture,__ZN23ir_hierarchical_visitor11visit_enterEP10ir_swizzle,__ZN23ir_hierarchical_visitor11visit_leaveEP10ir_swizzle,__ZN23ir_hierarchical_visitor11visit_enterEP20ir_dereference_array,__ZN23ir_hierarchical_visitor11visit_leaveEP20ir_dereference_array,__ZN23ir_hierarchical_visitor11visit_enterEP21ir_dereference_record,__ZN23ir_hierarchical_visitor11visit_leaveEP21ir_dereference_record,__ZN23ir_hierarchical_visitor11visit_enterEP13ir_assignment,__ZN23ir_hierarchical_visitor11visit_leaveEP13ir_assignment,__ZN23ir_hierarchical_visitor11visit_enterEP7ir_call,__ZN23ir_hierarchical_visitor11visit_leaveEP7ir_call,__ZN23ir_hierarchical_visitor11visit_enterEP9ir_return
,__ZN23ir_hierarchical_visitor11visit_leaveEP9ir_return,__ZN23ir_hierarchical_visitor11visit_enterEP10ir_discard,__ZN23ir_hierarchical_visitor11visit_leaveEP10ir_discard,__ZN23ir_hierarchical_visitor11visit_enterEP5ir_if,__ZN23ir_hierarchical_visitor11visit_leaveEP5ir_if,__ZN23ir_hierarchical_visitor11visit_enterEP14ir_emit_vertex,__ZN23ir_hierarchical_visitor11visit_leaveEP14ir_emit_vertex,__ZN23ir_hierarchical_visitor11visit_enterEP16ir_end_primitive,__ZN23ir_hierarchical_visitor11visit_leaveEP16ir_end_primitive,__ZN9ir_rvalue6acceptEP23ir_hierarchical_visitor,__ZN9ir_rvalue25constant_expression_valueEP10hash_table,__ZN5ir_if6acceptEP23ir_hierarchical_visitor,__ZN7ir_call6acceptEP23ir_hierarchical_visitor,__ZN7ir_call25constant_expression_valueEP10hash_table,__ZN9ir_return6acceptEP23ir_hierarchical_visitor,__ZN12ir_loop_jump6acceptEP23ir_hierarchical_visitor,__ZN10ir_discard6acceptEP23ir_hierarchical_visitor,__ZN10ir_texture6acceptEP23ir_hierarchical_visitor,__ZN10ir_texture25constant_expression_valueEP10hash_table,__ZN22ir_precision_statement6acceptEP23ir_hierarchical_visitor,__ZN21ir_typedecl_statement6acceptEP23ir_hierarchical_visitor,__ZN11ir_constant6acceptEP23ir_hierarchical_visitor,__ZN11ir_constant25constant_expression_valueEP10hash_table,__ZN23ir_dereference_variable6acceptEP23ir_hierarchical_visitor,__ZN23ir_dereference_variable25constant_expression_valueEP10hash_table,__ZN21ir_function_signature6acceptEP23ir_hierarchical_visitor,__ZN11ir_variable6acceptEP23ir_hierarchical_visitor,__ZN11ir_function6acceptEP23ir_hierarchical_visitor,__ZN7ir_loop6acceptEP23ir_hierarchical_visitor,__ZN13ir_assignment6acceptEP23ir_hierarchical_visitor
,__ZN13ir_assignment25constant_expression_valueEP10hash_table,__ZN10ir_swizzle6acceptEP23ir_hierarchical_visitor,__ZN10ir_swizzle25constant_expression_valueEP10hash_table,__ZN20ir_dereference_array6acceptEP23ir_hierarchical_visitor,__ZN20ir_dereference_array25constant_expression_valueEP10hash_table,__ZN21ir_dereference_record6acceptEP23ir_hierarchical_visitor,__ZN21ir_dereference_record25constant_expression_valueEP10hash_table,__ZN23ir_hierarchical_visitor5visitEP23ir_dereference_variable,__ZN21fixup_ir_call_visitor11visit_enterEP7ir_call,__ZN13ir_expression6acceptEP23ir_hierarchical_visitor,__ZN13ir_expression25constant_expression_valueEP10hash_table,__ZN30ir_function_can_inline_visitor11visit_enterEP9ir_return,__ZN12_GLOBAL__N_121has_recursion_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_121has_recursion_visitor11visit_leaveEP21ir_function_signature,__ZN12_GLOBAL__N_121has_recursion_visitor11visit_enterEP7ir_call,__ZN14ir_emit_vertex6acceptEP23ir_hierarchical_visitor,__ZN16ir_end_primitive6acceptEP23ir_hierarchical_visitor,__ZN17ir_rvalue_visitor11visit_leaveEP13ir_expression,__ZN17ir_rvalue_visitor11visit_leaveEP10ir_texture,__ZN17ir_rvalue_visitor11visit_leaveEP10ir_swizzle,__ZN17ir_rvalue_visitor11visit_leaveEP20ir_dereference_array,__ZN17ir_rvalue_visitor11visit_leaveEP21ir_dereference_record,__ZN17ir_rvalue_visitor11visit_leaveEP13ir_assignment,__ZN17ir_rvalue_visitor11visit_leaveEP7ir_call,__ZN17ir_rvalue_visitor11visit_leaveEP9ir_return,__ZN17ir_rvalue_visitor11visit_leaveEP5ir_if,__ZN17ir_rvalue_visitor11visit_leaveEP14ir_emit_vertex,__ZN17ir_rvalue_visitor11visit_leaveEP16ir_end_primitive,__ZN23ir_rvalue_enter_visitor11visit_enterEP13ir_expression,__ZN23ir_rvalue_enter_visitor11visit_enterEP10ir_texture
,__ZN23ir_rvalue_enter_visitor11visit_enterEP10ir_swizzle,__ZN23ir_rvalue_enter_visitor11visit_enterEP20ir_dereference_array,__ZN23ir_rvalue_enter_visitor11visit_enterEP21ir_dereference_record,__ZN23ir_rvalue_enter_visitor11visit_enterEP13ir_assignment,__ZN23ir_rvalue_enter_visitor11visit_enterEP7ir_call,__ZN23ir_rvalue_enter_visitor11visit_enterEP9ir_return,__ZN23ir_rvalue_enter_visitor11visit_enterEP5ir_if,__ZN23ir_rvalue_enter_visitor11visit_enterEP14ir_emit_vertex,__ZN23ir_rvalue_enter_visitor11visit_enterEP16ir_end_primitive,__ZN24ir_stats_counter_visitor11visit_leaveEP7ir_loop,__ZN24ir_stats_counter_visitor11visit_leaveEP13ir_expression,__ZN24ir_stats_counter_visitor11visit_leaveEP10ir_texture,__ZN24ir_stats_counter_visitor11visit_leaveEP13ir_assignment,__ZN24ir_stats_counter_visitor11visit_leaveEP9ir_return,__ZN24ir_stats_counter_visitor11visit_leaveEP10ir_discard,__ZN24ir_stats_counter_visitor11visit_leaveEP5ir_if,__ZN23ir_struct_usage_visitor5visitEP23ir_dereference_variable,__ZN23ir_decl_removal_visitor5visitEP21ir_typedecl_statement,__ZN28ir_variable_refcount_visitor5visitEP11ir_variable,__ZN28ir_variable_refcount_visitor5visitEP23ir_dereference_variable,__ZN28ir_variable_refcount_visitor11visit_enterEP21ir_function_signature,__ZN28ir_variable_refcount_visitor11visit_enterEP13ir_assignment,__ZN28ir_variable_refcount_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_117call_link_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_117call_link_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_117call_link_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_117call_link_visitor11visit_leaveEP7ir_call,__ZN33link_uniform_block_active_visitor5visitEP11ir_variable,__ZN33link_uniform_block_active_visitor5visitEP23ir_dereference_variable,__ZN33link_uniform_block_active_visitor11visit_enterEP20ir_dereference_array
,__ZN20array_sizing_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_125geom_array_resize_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_125geom_array_resize_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_125geom_array_resize_visitor11visit_leaveEP20ir_dereference_array,__ZZ15remap_variablesP14ir_instructionP9gl_shaderP10hash_tableEN13remap_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_113loop_analysis5visitEP12ir_loop_jump,__ZN12_GLOBAL__N_113loop_analysis5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_113loop_analysis11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_113loop_analysis11visit_leaveEP7ir_loop,__ZN12_GLOBAL__N_113loop_analysis11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_113loop_analysis11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_113loop_analysis11visit_enterEP7ir_call,__ZN12_GLOBAL__N_113loop_analysis11visit_enterEP5ir_if,__ZN12_GLOBAL__N_113loop_analysis11visit_leaveEP5ir_if,__ZN11examine_rhs5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_120loop_control_visitor11visit_leaveEP7ir_loop,__ZN12_GLOBAL__N_119loop_unroll_visitor11visit_leaveEP7ir_loop,__ZN17loop_unroll_count11visit_enterEP7ir_loop,__ZN17loop_unroll_count11visit_enterEP13ir_expression,__ZN17loop_unroll_count11visit_enterEP20ir_dereference_array,__ZN17loop_unroll_count11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_126lower_instructions_visitor11visit_leaveEP13ir_expression,__ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP13ir_expression,__ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP10ir_swizzle,__ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP9ir_return,__ZN12_GLOBAL__N_131ir_vec_index_to_swizzle_visitor11visit_enterEP5ir_if,__ZN12_GLOBAL__N_123lower_vertex_id_visitor5visitEP23ir_dereference_variable,__ZN26ir_array_splitting_visitor11visit_leaveEP13ir_assignment
,__ZN12_GLOBAL__N_126ir_array_reference_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_126ir_array_reference_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_126ir_array_reference_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_126ir_array_reference_visitor11visit_enterEP20ir_dereference_array,__ZN12_GLOBAL__N_127ir_constant_folding_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_127ir_constant_folding_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP11ir_function,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_131ir_constant_propagation_visitor11visit_enterEP5ir_if,__ZN12_GLOBAL__N_128ir_constant_variable_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_128ir_constant_variable_visitor11visit_enterEP23ir_dereference_variable,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP11ir_function,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_127ir_copy_propagation_visitor11visit_enterEP5ir_if,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_leaveEP10ir_swizzle,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_136ir_copy_propagation_elements_visitor11visit_enterEP5ir_if
,__ZN12_GLOBAL__N_111cse_visitor11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_111cse_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_111cse_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_111cse_visitor11visit_enterEP5ir_if,__ZN12_GLOBAL__N_124is_cse_candidate_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_123kill_for_derefs_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_123kill_for_derefs_visitor11visit_leaveEP14ir_emit_vertex,__ZN12_GLOBAL__N_123kill_for_derefs_visitor5visitEP10ir_swizzle,__ZN12_GLOBAL__N_117array_index_visit11visit_enterEP20ir_dereference_array,__ZN12_GLOBAL__N_125ir_dead_functions_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_125ir_dead_functions_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_119nested_if_flattener11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_119nested_if_flattener11visit_leaveEP5ir_if,__ZN31ir_variable_replacement_visitor11visit_leaveEP10ir_texture,__ZN31ir_variable_replacement_visitor11visit_leaveEP20ir_dereference_array,__ZN31ir_variable_replacement_visitor11visit_leaveEP21ir_dereference_record,__ZN31ir_variable_replacement_visitor11visit_leaveEP7ir_call,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_leaveEP21ir_function_signature,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP13ir_expression,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP10ir_texture,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP10ir_swizzle,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_128ir_function_inlining_visitor11visit_enterEP9ir_return,__ZN12_GLOBAL__N_128ir_if_simplification_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_128ir_if_simplification_visitor11visit_leaveEP5ir_if,__ZN12_GLOBAL__N_123redundant_jumps_visitor11visit_leaveEP7ir_loop,__ZN12_GLOBAL__N_123redundant_jumps_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_123redundant_jumps_visitor11visit_leaveEP5ir_if,__ZN12_GLOBAL__N_130ir_structure_reference_visitor5visitEP11ir_variable
,__ZN12_GLOBAL__N_130ir_structure_reference_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_130ir_structure_reference_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_130ir_structure_reference_visitor11visit_enterEP21ir_dereference_record,__ZN12_GLOBAL__N_130ir_structure_reference_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_130ir_structure_splitting_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_126ir_swizzle_swizzle_visitor11visit_enterEP10ir_swizzle,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP11ir_function,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP13ir_expression,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP10ir_texture,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP10ir_swizzle,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP7ir_call,__ZN12_GLOBAL__N_124ir_tree_grafting_visitor11visit_enterEP5ir_if,__ZN27ir_vector_splitting_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_127ir_vector_reference_visitor5visitEP11ir_variable,__ZN12_GLOBAL__N_127ir_vector_reference_visitor5visitEP23ir_dereference_variable,__ZN12_GLOBAL__N_127ir_vector_reference_visitor11visit_enterEP21ir_function_signature,__ZN12_GLOBAL__N_127ir_vector_reference_visitor11visit_enterEP10ir_swizzle,__ZN12_GLOBAL__N_127ir_vector_reference_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP7ir_loop,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP13ir_expression,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP10ir_texture,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP10ir_swizzle,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP20ir_dereference_array,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP13ir_assignment,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_leaveEP13ir_assignment,__ZN12_GLOBAL__N_120ir_vectorize_visitor11visit_enterEP5ir_if
,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9pbackfailEj,__ZNSt3__111__stdoutbufIwE8overflowEj,__ZNSt3__110__stdinbufIwE9pbackfailEj,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE8overflowEj,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9pbackfailEi,__ZNSt3__111__stdoutbufIcE8overflowEi,__ZNSt3__110__stdinbufIcE9pbackfailEi,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE8overflowEi,__ZNKSt3__15ctypeIcE10do_toupperEc,__ZNKSt3__15ctypeIcE10do_tolowerEc,__ZNKSt3__15ctypeIcE8do_widenEc,__ZNKSt3__15ctypeIwE10do_toupperEw,__ZNKSt3__15ctypeIwE10do_tolowerEw,__ZNKSt3__15ctypeIwE8do_widenEc,_strcmp,_hash_table_pointer_compare,__ZN9glsl_type18record_key_compareEPKvS1_,__mesa_key_pointer_equal,__mesa_key_string_equal,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18];
var FUNCTION_TABLE_id = [b19,__ZL15pack_snorm_1x16f,__ZL14pack_snorm_1x8f,__ZL15pack_unorm_1x16f,__ZL14pack_unorm_1x8f,__ZL14pack_half_1x16f,b19,b19];
var FUNCTION_TABLE_iiiiii = [b20,__ZNKSt3__17collateIcE10do_compareEPKcS3_S3_S3_,__ZNKSt3__17collateIwE10do_compareEPKwS3_S3_S3_,__ZNKSt3__15ctypeIcE9do_narrowEPKcS3_cPc,__ZNKSt3__17codecvtIwc11__mbstate_tE10do_unshiftERS1_PcS4_RS4_,__ZNKSt3__17codecvtIwc11__mbstate_tE9do_lengthERS1_PKcS5_j,__ZNKSt3__15ctypeIwE9do_narrowEPKwS3_cPc,__ZNKSt3__17codecvtIcc11__mbstate_tE10do_unshiftERS1_PcS4_RS4_,__ZNKSt3__17codecvtIcc11__mbstate_tE9do_lengthERS1_PKcS5_j,__ZNKSt3__17codecvtIDsc11__mbstate_tE10do_unshiftERS1_PcS4_RS4_,__ZNKSt3__17codecvtIDsc11__mbstate_tE9do_lengthERS1_PKcS5_j,__ZNKSt3__17codecvtIDic11__mbstate_tE10do_unshiftERS1_PcS4_RS4_,__ZNKSt3__17codecvtIDic11__mbstate_tE9do_lengthERS1_PKcS5_j,b20,b20,b20];

  return { ___cxa_can_catch: ___cxa_can_catch, _optimize_glsl: _optimize_glsl, _free: _free, ___cxa_is_pointer_type: ___cxa_is_pointer_type, _i64Add: _i64Add, _memmove: _memmove, _realloc: _realloc, _i64Subtract: _i64Subtract, _memset: _memset, _malloc: _malloc, _bitshift64Ashr: _bitshift64Ashr, _memcpy: _memcpy, _strlen: _strlen, _bitshift64Lshr: _bitshift64Lshr, _calloc: _calloc, _bitshift64Shl: _bitshift64Shl, __GLOBAL__sub_I_builtin_functions_cpp: __GLOBAL__sub_I_builtin_functions_cpp, __GLOBAL__sub_I_builtin_types_cpp: __GLOBAL__sub_I_builtin_types_cpp, __GLOBAL__sub_I_iostream_cpp: __GLOBAL__sub_I_iostream_cpp, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, emterpret: emterpret, dynCall_iiii: dynCall_iiii, dynCall_viiiiii: dynCall_viiiiii, dynCall_viiiii: dynCall_viiiii, dynCall_viiii: dynCall_viiii, dynCall_viiiiiii: dynCall_viiiiiii, dynCall_di: dynCall_di, dynCall_vi: dynCall_vi, dynCall_vii: dynCall_vii, dynCall_viiiiiiiii: dynCall_viiiiiiiii, dynCall_ii: dynCall_ii, dynCall_viiiiiid: dynCall_viiiiiid, dynCall_viii: dynCall_viii, dynCall_viiiiid: dynCall_viiiiid, dynCall_v: dynCall_v, dynCall_iiiiiiiii: dynCall_iiiiiiiii, dynCall_iiiii: dynCall_iiiii, dynCall_viiiiiiii: dynCall_viiiiiiii, dynCall_iidi: dynCall_iidi, dynCall_iii: dynCall_iii, dynCall_id: dynCall_id, dynCall_iiiiii: dynCall_iiiiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var _optimize_glsl = Module["_optimize_glsl"] = asm["_optimize_glsl"];
var _free = Module["_free"] = asm["_free"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _bitshift64Ashr = Module["_bitshift64Ashr"] = asm["_bitshift64Ashr"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var __GLOBAL__sub_I_builtin_functions_cpp = Module["__GLOBAL__sub_I_builtin_functions_cpp"] = asm["__GLOBAL__sub_I_builtin_functions_cpp"];
var __GLOBAL__sub_I_builtin_types_cpp = Module["__GLOBAL__sub_I_builtin_types_cpp"] = asm["__GLOBAL__sub_I_builtin_types_cpp"];
var __GLOBAL__sub_I_iostream_cpp = Module["__GLOBAL__sub_I_iostream_cpp"] = asm["__GLOBAL__sub_I_iostream_cpp"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = asm["dynCall_viiiiiii"];
var dynCall_di = Module["dynCall_di"] = asm["dynCall_di"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = asm["dynCall_viiiiiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viiiiiid = Module["dynCall_viiiiiid"] = asm["dynCall_viiiiiid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiiiid = Module["dynCall_viiiiid"] = asm["dynCall_viiiiid"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = asm["dynCall_viiiiiiii"];
var dynCall_iidi = Module["dynCall_iidi"] = asm["dynCall_iidi"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_id = Module["dynCall_id"] = asm["dynCall_id"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
Runtime.stackAlloc = asm["stackAlloc"];
Runtime.stackSave = asm["stackSave"];
Runtime.stackRestore = asm["stackRestore"];
Runtime.setTempRet0 = asm["setTempRet0"];
Runtime.getTempRet0 = asm["getTempRet0"];
var i64Math = (function() {
 var goog = {
  math: {}
 };
 goog.math.Long = (function(low, high) {
  this.low_ = low | 0;
  this.high_ = high | 0;
 });
 goog.math.Long.IntCache_ = {};
 goog.math.Long.fromInt = (function(value) {
  if (-128 <= value && value < 128) {
   var cachedObj = goog.math.Long.IntCache_[value];
   if (cachedObj) {
    return cachedObj;
   }
  }
  var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
   goog.math.Long.IntCache_[value] = obj;
  }
  return obj;
 });
 goog.math.Long.fromNumber = (function(value) {
  if (isNaN(value) || !isFinite(value)) {
   return goog.math.Long.ZERO;
  } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
   return goog.math.Long.MIN_VALUE;
  } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
   return goog.math.Long.MAX_VALUE;
  } else if (value < 0) {
   return goog.math.Long.fromNumber(-value).negate();
  } else {
   return new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0);
  }
 });
 goog.math.Long.fromBits = (function(lowBits, highBits) {
  return new goog.math.Long(lowBits, highBits);
 });
 goog.math.Long.fromString = (function(str, opt_radix) {
  if (str.length == 0) {
   throw Error("number format error: empty string");
  }
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
   throw Error("radix out of range: " + radix);
  }
  if (str.charAt(0) == "-") {
   return goog.math.Long.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf("-") >= 0) {
   throw Error('number format error: interior "-" character: ' + str);
  }
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
  var result = goog.math.Long.ZERO;
  for (var i = 0; i < str.length; i += 8) {
   var size = Math.min(8, str.length - i);
   var value = parseInt(str.substring(i, i + size), radix);
   if (size < 8) {
    var power = goog.math.Long.fromNumber(Math.pow(radix, size));
    result = result.multiply(power).add(goog.math.Long.fromNumber(value));
   } else {
    result = result.multiply(radixToPower);
    result = result.add(goog.math.Long.fromNumber(value));
   }
  }
  return result;
 });
 goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;
 goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;
 goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
 goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;
 goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
 goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
 goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;
 goog.math.Long.ZERO = goog.math.Long.fromInt(0);
 goog.math.Long.ONE = goog.math.Long.fromInt(1);
 goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);
 goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(4294967295 | 0, 2147483647 | 0);
 goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 2147483648 | 0);
 goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);
 goog.math.Long.prototype.toInt = (function() {
  return this.low_;
 });
 goog.math.Long.prototype.toNumber = (function() {
  return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
 });
 goog.math.Long.prototype.toString = (function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
   throw Error("radix out of range: " + radix);
  }
  if (this.isZero()) {
   return "0";
  }
  if (this.isNegative()) {
   if (this.equals(goog.math.Long.MIN_VALUE)) {
    var radixLong = goog.math.Long.fromNumber(radix);
    var div = this.div(radixLong);
    var rem = div.multiply(radixLong).subtract(this);
    return div.toString(radix) + rem.toInt().toString(radix);
   } else {
    return "-" + this.negate().toString(radix);
   }
  }
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
  var rem = this;
  var result = "";
  while (true) {
   var remDiv = rem.div(radixToPower);
   var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
   var digits = intval.toString(radix);
   rem = remDiv;
   if (rem.isZero()) {
    return digits + result;
   } else {
    while (digits.length < 6) {
     digits = "0" + digits;
    }
    result = "" + digits + result;
   }
  }
 });
 goog.math.Long.prototype.getHighBits = (function() {
  return this.high_;
 });
 goog.math.Long.prototype.getLowBits = (function() {
  return this.low_;
 });
 goog.math.Long.prototype.getLowBitsUnsigned = (function() {
  return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
 });
 goog.math.Long.prototype.getNumBitsAbs = (function() {
  if (this.isNegative()) {
   if (this.equals(goog.math.Long.MIN_VALUE)) {
    return 64;
   } else {
    return this.negate().getNumBitsAbs();
   }
  } else {
   var val = this.high_ != 0 ? this.high_ : this.low_;
   for (var bit = 31; bit > 0; bit--) {
    if ((val & 1 << bit) != 0) {
     break;
    }
   }
   return this.high_ != 0 ? bit + 33 : bit + 1;
  }
 });
 goog.math.Long.prototype.isZero = (function() {
  return this.high_ == 0 && this.low_ == 0;
 });
 goog.math.Long.prototype.isNegative = (function() {
  return this.high_ < 0;
 });
 goog.math.Long.prototype.isOdd = (function() {
  return (this.low_ & 1) == 1;
 });
 goog.math.Long.prototype.equals = (function(other) {
  return this.high_ == other.high_ && this.low_ == other.low_;
 });
 goog.math.Long.prototype.notEquals = (function(other) {
  return this.high_ != other.high_ || this.low_ != other.low_;
 });
 goog.math.Long.prototype.lessThan = (function(other) {
  return this.compare(other) < 0;
 });
 goog.math.Long.prototype.lessThanOrEqual = (function(other) {
  return this.compare(other) <= 0;
 });
 goog.math.Long.prototype.greaterThan = (function(other) {
  return this.compare(other) > 0;
 });
 goog.math.Long.prototype.greaterThanOrEqual = (function(other) {
  return this.compare(other) >= 0;
 });
 goog.math.Long.prototype.compare = (function(other) {
  if (this.equals(other)) {
   return 0;
  }
  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
   return -1;
  }
  if (!thisNeg && otherNeg) {
   return 1;
  }
  if (this.subtract(other).isNegative()) {
   return -1;
  } else {
   return 1;
  }
 });
 goog.math.Long.prototype.negate = (function() {
  if (this.equals(goog.math.Long.MIN_VALUE)) {
   return goog.math.Long.MIN_VALUE;
  } else {
   return this.not().add(goog.math.Long.ONE);
  }
 });
 goog.math.Long.prototype.add = (function(other) {
  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 65535;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 65535;
  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 65535;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 65535;
  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 65535;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 65535;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c48 += a48 + b48;
  c48 &= 65535;
  return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
 });
 goog.math.Long.prototype.subtract = (function(other) {
  return this.add(other.negate());
 });
 goog.math.Long.prototype.multiply = (function(other) {
  if (this.isZero()) {
   return goog.math.Long.ZERO;
  } else if (other.isZero()) {
   return goog.math.Long.ZERO;
  }
  if (this.equals(goog.math.Long.MIN_VALUE)) {
   return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
  } else if (other.equals(goog.math.Long.MIN_VALUE)) {
   return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
  }
  if (this.isNegative()) {
   if (other.isNegative()) {
    return this.negate().multiply(other.negate());
   } else {
    return this.negate().multiply(other).negate();
   }
  } else if (other.isNegative()) {
   return this.multiply(other.negate()).negate();
  }
  if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) {
   return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
  }
  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 65535;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 65535;
  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 65535;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 65535;
  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 65535;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 65535;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 65535;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 65535;
  return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
 });
 goog.math.Long.prototype.div = (function(other) {
  if (other.isZero()) {
   throw Error("division by zero");
  } else if (this.isZero()) {
   return goog.math.Long.ZERO;
  }
  if (this.equals(goog.math.Long.MIN_VALUE)) {
   if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) {
    return goog.math.Long.MIN_VALUE;
   } else if (other.equals(goog.math.Long.MIN_VALUE)) {
    return goog.math.Long.ONE;
   } else {
    var halfThis = this.shiftRight(1);
    var approx = halfThis.div(other).shiftLeft(1);
    if (approx.equals(goog.math.Long.ZERO)) {
     return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
    } else {
     var rem = this.subtract(other.multiply(approx));
     var result = approx.add(rem.div(other));
     return result;
    }
   }
  } else if (other.equals(goog.math.Long.MIN_VALUE)) {
   return goog.math.Long.ZERO;
  }
  if (this.isNegative()) {
   if (other.isNegative()) {
    return this.negate().div(other.negate());
   } else {
    return this.negate().div(other).negate();
   }
  } else if (other.isNegative()) {
   return this.div(other.negate()).negate();
  }
  var res = goog.math.Long.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
   var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
   var log2 = Math.ceil(Math.log(approx) / Math.LN2);
   var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
   var approxRes = goog.math.Long.fromNumber(approx);
   var approxRem = approxRes.multiply(other);
   while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
    approx -= delta;
    approxRes = goog.math.Long.fromNumber(approx);
    approxRem = approxRes.multiply(other);
   }
   if (approxRes.isZero()) {
    approxRes = goog.math.Long.ONE;
   }
   res = res.add(approxRes);
   rem = rem.subtract(approxRem);
  }
  return res;
 });
 goog.math.Long.prototype.modulo = (function(other) {
  return this.subtract(this.div(other).multiply(other));
 });
 goog.math.Long.prototype.not = (function() {
  return goog.math.Long.fromBits(~this.low_, ~this.high_);
 });
 goog.math.Long.prototype.and = (function(other) {
  return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
 });
 goog.math.Long.prototype.or = (function(other) {
  return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
 });
 goog.math.Long.prototype.xor = (function(other) {
  return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
 });
 goog.math.Long.prototype.shiftLeft = (function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
   return this;
  } else {
   var low = this.low_;
   if (numBits < 32) {
    var high = this.high_;
    return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits);
   } else {
    return goog.math.Long.fromBits(0, low << numBits - 32);
   }
  }
 });
 goog.math.Long.prototype.shiftRight = (function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
   return this;
  } else {
   var high = this.high_;
   if (numBits < 32) {
    var low = this.low_;
    return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits);
   } else {
    return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1);
   }
  }
 });
 goog.math.Long.prototype.shiftRightUnsigned = (function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
   return this;
  } else {
   var high = this.high_;
   if (numBits < 32) {
    var low = this.low_;
    return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits);
   } else if (numBits == 32) {
    return goog.math.Long.fromBits(high, 0);
   } else {
    return goog.math.Long.fromBits(high >>> numBits - 32, 0);
   }
  }
 });
 var navigator = {
  appName: "Modern Browser"
 };
 var dbits;
 var canary = 0xdeadbeefcafe;
 var j_lm = (canary & 16777215) == 15715070;
 function BigInteger(a, b, c) {
  if (a != null) if ("number" == typeof a) this.fromNumber(a, b, c); else if (b == null && "string" != typeof a) this.fromString(a, 256); else this.fromString(a, b);
 }
 function nbi() {
  return new BigInteger(null);
 }
 function am1(i, x, w, j, c, n) {
  while (--n >= 0) {
   var v = x * this[i++] + w[j] + c;
   c = Math.floor(v / 67108864);
   w[j++] = v & 67108863;
  }
  return c;
 }
 function am2(i, x, w, j, c, n) {
  var xl = x & 32767, xh = x >> 15;
  while (--n >= 0) {
   var l = this[i] & 32767;
   var h = this[i++] >> 15;
   var m = xh * l + h * xl;
   l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
   c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
   w[j++] = l & 1073741823;
  }
  return c;
 }
 function am3(i, x, w, j, c, n) {
  var xl = x & 16383, xh = x >> 14;
  while (--n >= 0) {
   var l = this[i] & 16383;
   var h = this[i++] >> 14;
   var m = xh * l + h * xl;
   l = xl * l + ((m & 16383) << 14) + w[j] + c;
   c = (l >> 28) + (m >> 14) + xh * h;
   w[j++] = l & 268435455;
  }
  return c;
 }
 if (j_lm && navigator.appName == "Microsoft Internet Explorer") {
  BigInteger.prototype.am = am2;
  dbits = 30;
 } else if (j_lm && navigator.appName != "Netscape") {
  BigInteger.prototype.am = am1;
  dbits = 26;
 } else {
  BigInteger.prototype.am = am3;
  dbits = 28;
 }
 BigInteger.prototype.DB = dbits;
 BigInteger.prototype.DM = (1 << dbits) - 1;
 BigInteger.prototype.DV = 1 << dbits;
 var BI_FP = 52;
 BigInteger.prototype.FV = Math.pow(2, BI_FP);
 BigInteger.prototype.F1 = BI_FP - dbits;
 BigInteger.prototype.F2 = 2 * dbits - BI_FP;
 var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
 var BI_RC = new Array;
 var rr, vv;
 rr = "0".charCodeAt(0);
 for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
 rr = "a".charCodeAt(0);
 for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
 rr = "A".charCodeAt(0);
 for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
 function int2char(n) {
  return BI_RM.charAt(n);
 }
 function intAt(s, i) {
  var c = BI_RC[s.charCodeAt(i)];
  return c == null ? -1 : c;
 }
 function bnpCopyTo(r) {
  for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
 }
 function bnpFromInt(x) {
  this.t = 1;
  this.s = x < 0 ? -1 : 0;
  if (x > 0) this[0] = x; else if (x < -1) this[0] = x + DV; else this.t = 0;
 }
 function nbv(i) {
  var r = nbi();
  r.fromInt(i);
  return r;
 }
 function bnpFromString(s, b) {
  var k;
  if (b == 16) k = 4; else if (b == 8) k = 3; else if (b == 256) k = 8; else if (b == 2) k = 1; else if (b == 32) k = 5; else if (b == 4) k = 2; else {
   this.fromRadix(s, b);
   return;
  }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while (--i >= 0) {
   var x = k == 8 ? s[i] & 255 : intAt(s, i);
   if (x < 0) {
    if (s.charAt(i) == "-") mi = true;
    continue;
   }
   mi = false;
   if (sh == 0) this[this.t++] = x; else if (sh + k > this.DB) {
    this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
    this[this.t++] = x >> this.DB - sh;
   } else this[this.t - 1] |= x << sh;
   sh += k;
   if (sh >= this.DB) sh -= this.DB;
  }
  if (k == 8 && (s[0] & 128) != 0) {
   this.s = -1;
   if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh;
  }
  this.clamp();
  if (mi) BigInteger.ZERO.subTo(this, this);
 }
 function bnpClamp() {
  var c = this.s & this.DM;
  while (this.t > 0 && this[this.t - 1] == c) --this.t;
 }
 function bnToString(b) {
  if (this.s < 0) return "-" + this.negate().toString(b);
  var k;
  if (b == 16) k = 4; else if (b == 8) k = 3; else if (b == 2) k = 1; else if (b == 32) k = 5; else if (b == 4) k = 2; else return this.toRadix(b);
  var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
  var p = this.DB - i * this.DB % k;
  if (i-- > 0) {
   if (p < this.DB && (d = this[i] >> p) > 0) {
    m = true;
    r = int2char(d);
   }
   while (i >= 0) {
    if (p < k) {
     d = (this[i] & (1 << p) - 1) << k - p;
     d |= this[--i] >> (p += this.DB - k);
    } else {
     d = this[i] >> (p -= k) & km;
     if (p <= 0) {
      p += this.DB;
      --i;
     }
    }
    if (d > 0) m = true;
    if (m) r += int2char(d);
   }
  }
  return m ? r : "0";
 }
 function bnNegate() {
  var r = nbi();
  BigInteger.ZERO.subTo(this, r);
  return r;
 }
 function bnAbs() {
  return this.s < 0 ? this.negate() : this;
 }
 function bnCompareTo(a) {
  var r = this.s - a.s;
  if (r != 0) return r;
  var i = this.t;
  r = i - a.t;
  if (r != 0) return this.s < 0 ? -r : r;
  while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;
  return 0;
 }
 function nbits(x) {
  var r = 1, t;
  if ((t = x >>> 16) != 0) {
   x = t;
   r += 16;
  }
  if ((t = x >> 8) != 0) {
   x = t;
   r += 8;
  }
  if ((t = x >> 4) != 0) {
   x = t;
   r += 4;
  }
  if ((t = x >> 2) != 0) {
   x = t;
   r += 2;
  }
  if ((t = x >> 1) != 0) {
   x = t;
   r += 1;
  }
  return r;
 }
 function bnBitLength() {
  if (this.t <= 0) return 0;
  return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
 }
 function bnpDLShiftTo(n, r) {
  var i;
  for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
  for (i = n - 1; i >= 0; --i) r[i] = 0;
  r.t = this.t + n;
  r.s = this.s;
 }
 function bnpDRShiftTo(n, r) {
  for (var i = n; i < this.t; ++i) r[i - n] = this[i];
  r.t = Math.max(this.t - n, 0);
  r.s = this.s;
 }
 function bnpLShiftTo(n, r) {
  var bs = n % this.DB;
  var cbs = this.DB - bs;
  var bm = (1 << cbs) - 1;
  var ds = Math.floor(n / this.DB), c = this.s << bs & this.DM, i;
  for (i = this.t - 1; i >= 0; --i) {
   r[i + ds + 1] = this[i] >> cbs | c;
   c = (this[i] & bm) << bs;
  }
  for (i = ds - 1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t + ds + 1;
  r.s = this.s;
  r.clamp();
 }
 function bnpRShiftTo(n, r) {
  r.s = this.s;
  var ds = Math.floor(n / this.DB);
  if (ds >= this.t) {
   r.t = 0;
   return;
  }
  var bs = n % this.DB;
  var cbs = this.DB - bs;
  var bm = (1 << bs) - 1;
  r[0] = this[ds] >> bs;
  for (var i = ds + 1; i < this.t; ++i) {
   r[i - ds - 1] |= (this[i] & bm) << cbs;
   r[i - ds] = this[i] >> bs;
  }
  if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
  r.t = this.t - ds;
  r.clamp();
 }
 function bnpSubTo(a, r) {
  var i = 0, c = 0, m = Math.min(a.t, this.t);
  while (i < m) {
   c += this[i] - a[i];
   r[i++] = c & this.DM;
   c >>= this.DB;
  }
  if (a.t < this.t) {
   c -= a.s;
   while (i < this.t) {
    c += this[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c += this.s;
  } else {
   c += this.s;
   while (i < a.t) {
    c -= a[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c -= a.s;
  }
  r.s = c < 0 ? -1 : 0;
  if (c < -1) r[i++] = this.DV + c; else if (c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
 }
 function bnpMultiplyTo(a, r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i + y.t;
  while (--i >= 0) r[i] = 0;
  for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
  r.s = 0;
  r.clamp();
  if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
 }
 function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2 * x.t;
  while (--i >= 0) r[i] = 0;
  for (i = 0; i < x.t - 1; ++i) {
   var c = x.am(i, x[i], r, 2 * i, 0, 1);
   if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
    r[i + x.t] -= x.DV;
    r[i + x.t + 1] = 1;
   }
  }
  if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
  r.s = 0;
  r.clamp();
 }
 function bnpDivRemTo(m, q, r) {
  var pm = m.abs();
  if (pm.t <= 0) return;
  var pt = this.abs();
  if (pt.t < pm.t) {
   if (q != null) q.fromInt(0);
   if (r != null) this.copyTo(r);
   return;
  }
  if (r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB - nbits(pm[pm.t - 1]);
  if (nsh > 0) {
   pm.lShiftTo(nsh, y);
   pt.lShiftTo(nsh, r);
  } else {
   pm.copyTo(y);
   pt.copyTo(r);
  }
  var ys = y.t;
  var y0 = y[ys - 1];
  if (y0 == 0) return;
  var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
  var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
  var i = r.t, j = i - ys, t = q == null ? nbi() : q;
  y.dlShiftTo(j, t);
  if (r.compareTo(t) >= 0) {
   r[r.t++] = 1;
   r.subTo(t, r);
  }
  BigInteger.ONE.dlShiftTo(ys, t);
  t.subTo(y, y);
  while (y.t < ys) y[y.t++] = 0;
  while (--j >= 0) {
   var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
   if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
    y.dlShiftTo(j, t);
    r.subTo(t, r);
    while (r[i] < --qd) r.subTo(t, r);
   }
  }
  if (q != null) {
   r.drShiftTo(ys, q);
   if (ts != ms) BigInteger.ZERO.subTo(q, q);
  }
  r.t = ys;
  r.clamp();
  if (nsh > 0) r.rShiftTo(nsh, r);
  if (ts < 0) BigInteger.ZERO.subTo(r, r);
 }
 function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a, null, r);
  if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
  return r;
 }
 function Classic(m) {
  this.m = m;
 }
 function cConvert(x) {
  if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m); else return x;
 }
 function cRevert(x) {
  return x;
 }
 function cReduce(x) {
  x.divRemTo(this.m, null, x);
 }
 function cMulTo(x, y, r) {
  x.multiplyTo(y, r);
  this.reduce(r);
 }
 function cSqrTo(x, r) {
  x.squareTo(r);
  this.reduce(r);
 }
 Classic.prototype.convert = cConvert;
 Classic.prototype.revert = cRevert;
 Classic.prototype.reduce = cReduce;
 Classic.prototype.mulTo = cMulTo;
 Classic.prototype.sqrTo = cSqrTo;
 function bnpInvDigit() {
  if (this.t < 1) return 0;
  var x = this[0];
  if ((x & 1) == 0) return 0;
  var y = x & 3;
  y = y * (2 - (x & 15) * y) & 15;
  y = y * (2 - (x & 255) * y) & 255;
  y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
  y = y * (2 - x * y % this.DV) % this.DV;
  return y > 0 ? this.DV - y : -y;
 }
 function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp & 32767;
  this.mph = this.mp >> 15;
  this.um = (1 << m.DB - 15) - 1;
  this.mt2 = 2 * m.t;
 }
 function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t, r);
  r.divRemTo(this.m, null, r);
  if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
  return r;
 }
 function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
 }
 function montReduce(x) {
  while (x.t <= this.mt2) x[x.t++] = 0;
  for (var i = 0; i < this.m.t; ++i) {
   var j = x[i] & 32767;
   var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
   j = i + this.m.t;
   x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
   while (x[j] >= x.DV) {
    x[j] -= x.DV;
    x[++j]++;
   }
  }
  x.clamp();
  x.drShiftTo(this.m.t, x);
  if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
 }
 function montSqrTo(x, r) {
  x.squareTo(r);
  this.reduce(r);
 }
 function montMulTo(x, y, r) {
  x.multiplyTo(y, r);
  this.reduce(r);
 }
 Montgomery.prototype.convert = montConvert;
 Montgomery.prototype.revert = montRevert;
 Montgomery.prototype.reduce = montReduce;
 Montgomery.prototype.mulTo = montMulTo;
 Montgomery.prototype.sqrTo = montSqrTo;
 function bnpIsEven() {
  return (this.t > 0 ? this[0] & 1 : this.s) == 0;
 }
 function bnpExp(e, z) {
  if (e > 4294967295 || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
  g.copyTo(r);
  while (--i >= 0) {
   z.sqrTo(r, r2);
   if ((e & 1 << i) > 0) z.mulTo(r2, g, r); else {
    var t = r;
    r = r2;
    r2 = t;
   }
  }
  return z.revert(r);
 }
 function bnModPowInt(e, m) {
  var z;
  if (e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e, z);
 }
 BigInteger.prototype.copyTo = bnpCopyTo;
 BigInteger.prototype.fromInt = bnpFromInt;
 BigInteger.prototype.fromString = bnpFromString;
 BigInteger.prototype.clamp = bnpClamp;
 BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
 BigInteger.prototype.drShiftTo = bnpDRShiftTo;
 BigInteger.prototype.lShiftTo = bnpLShiftTo;
 BigInteger.prototype.rShiftTo = bnpRShiftTo;
 BigInteger.prototype.subTo = bnpSubTo;
 BigInteger.prototype.multiplyTo = bnpMultiplyTo;
 BigInteger.prototype.squareTo = bnpSquareTo;
 BigInteger.prototype.divRemTo = bnpDivRemTo;
 BigInteger.prototype.invDigit = bnpInvDigit;
 BigInteger.prototype.isEven = bnpIsEven;
 BigInteger.prototype.exp = bnpExp;
 BigInteger.prototype.toString = bnToString;
 BigInteger.prototype.negate = bnNegate;
 BigInteger.prototype.abs = bnAbs;
 BigInteger.prototype.compareTo = bnCompareTo;
 BigInteger.prototype.bitLength = bnBitLength;
 BigInteger.prototype.mod = bnMod;
 BigInteger.prototype.modPowInt = bnModPowInt;
 BigInteger.ZERO = nbv(0);
 BigInteger.ONE = nbv(1);
 function bnpFromRadix(s, b) {
  this.fromInt(0);
  if (b == null) b = 10;
  var cs = this.chunkSize(b);
  var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
  for (var i = 0; i < s.length; ++i) {
   var x = intAt(s, i);
   if (x < 0) {
    if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
    continue;
   }
   w = b * w + x;
   if (++j >= cs) {
    this.dMultiply(d);
    this.dAddOffset(w, 0);
    j = 0;
    w = 0;
   }
  }
  if (j > 0) {
   this.dMultiply(Math.pow(b, j));
   this.dAddOffset(w, 0);
  }
  if (mi) BigInteger.ZERO.subTo(this, this);
 }
 function bnpChunkSize(r) {
  return Math.floor(Math.LN2 * this.DB / Math.log(r));
 }
 function bnSigNum() {
  if (this.s < 0) return -1; else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0; else return 1;
 }
 function bnpDMultiply(n) {
  this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
  ++this.t;
  this.clamp();
 }
 function bnpDAddOffset(n, w) {
  if (n == 0) return;
  while (this.t <= w) this[this.t++] = 0;
  this[w] += n;
  while (this[w] >= this.DV) {
   this[w] -= this.DV;
   if (++w >= this.t) this[this.t++] = 0;
   ++this[w];
  }
 }
 function bnpToRadix(b) {
  if (b == null) b = 10;
  if (this.signum() == 0 || b < 2 || b > 36) return "0";
  var cs = this.chunkSize(b);
  var a = Math.pow(b, cs);
  var d = nbv(a), y = nbi(), z = nbi(), r = "";
  this.divRemTo(d, y, z);
  while (y.signum() > 0) {
   r = (a + z.intValue()).toString(b).substr(1) + r;
   y.divRemTo(d, y, z);
  }
  return z.intValue().toString(b) + r;
 }
 function bnIntValue() {
  if (this.s < 0) {
   if (this.t == 1) return this[0] - this.DV; else if (this.t == 0) return -1;
  } else if (this.t == 1) return this[0]; else if (this.t == 0) return 0;
  return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0];
 }
 function bnpAddTo(a, r) {
  var i = 0, c = 0, m = Math.min(a.t, this.t);
  while (i < m) {
   c += this[i] + a[i];
   r[i++] = c & this.DM;
   c >>= this.DB;
  }
  if (a.t < this.t) {
   c += a.s;
   while (i < this.t) {
    c += this[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c += this.s;
  } else {
   c += this.s;
   while (i < a.t) {
    c += a[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c += a.s;
  }
  r.s = c < 0 ? -1 : 0;
  if (c > 0) r[i++] = c; else if (c < -1) r[i++] = this.DV + c;
  r.t = i;
  r.clamp();
 }
 BigInteger.prototype.fromRadix = bnpFromRadix;
 BigInteger.prototype.chunkSize = bnpChunkSize;
 BigInteger.prototype.signum = bnSigNum;
 BigInteger.prototype.dMultiply = bnpDMultiply;
 BigInteger.prototype.dAddOffset = bnpDAddOffset;
 BigInteger.prototype.toRadix = bnpToRadix;
 BigInteger.prototype.intValue = bnIntValue;
 BigInteger.prototype.addTo = bnpAddTo;
 var Wrapper = {
  abs: (function(l, h) {
   var x = new goog.math.Long(l, h);
   var ret;
   if (x.isNegative()) {
    ret = x.negate();
   } else {
    ret = x;
   }
   HEAP32[tempDoublePtr >> 2] = ret.low_;
   HEAP32[tempDoublePtr + 4 >> 2] = ret.high_;
  }),
  ensureTemps: (function() {
   if (Wrapper.ensuredTemps) return;
   Wrapper.ensuredTemps = true;
   Wrapper.two32 = new BigInteger;
   Wrapper.two32.fromString("4294967296", 10);
   Wrapper.two64 = new BigInteger;
   Wrapper.two64.fromString("18446744073709551616", 10);
   Wrapper.temp1 = new BigInteger;
   Wrapper.temp2 = new BigInteger;
  }),
  lh2bignum: (function(l, h) {
   var a = new BigInteger;
   a.fromString(h.toString(), 10);
   var b = new BigInteger;
   a.multiplyTo(Wrapper.two32, b);
   var c = new BigInteger;
   c.fromString(l.toString(), 10);
   var d = new BigInteger;
   c.addTo(b, d);
   return d;
  }),
  stringify: (function(l, h, unsigned) {
   var ret = (new goog.math.Long(l, h)).toString();
   if (unsigned && ret[0] == "-") {
    Wrapper.ensureTemps();
    var bignum = new BigInteger;
    bignum.fromString(ret, 10);
    ret = new BigInteger;
    Wrapper.two64.addTo(bignum, ret);
    ret = ret.toString(10);
   }
   return ret;
  }),
  fromString: (function(str, base, min, max, unsigned) {
   Wrapper.ensureTemps();
   var bignum = new BigInteger;
   bignum.fromString(str, base);
   var bigmin = new BigInteger;
   bigmin.fromString(min, 10);
   var bigmax = new BigInteger;
   bigmax.fromString(max, 10);
   if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
    var temp = new BigInteger;
    bignum.addTo(Wrapper.two64, temp);
    bignum = temp;
   }
   var error = false;
   if (bignum.compareTo(bigmin) < 0) {
    bignum = bigmin;
    error = true;
   } else if (bignum.compareTo(bigmax) > 0) {
    bignum = bigmax;
    error = true;
   }
   var ret = goog.math.Long.fromString(bignum.toString());
   HEAP32[tempDoublePtr >> 2] = ret.low_;
   HEAP32[tempDoublePtr + 4 >> 2] = ret.high_;
   if (error) throw "range error";
  })
 };
 return Wrapper;
})();
if (memoryInitializer) {
 if (typeof Module["locateFile"] === "function") {
  memoryInitializer = Module["locateFile"](memoryInitializer);
 } else if (Module["memoryInitializerPrefixURL"]) {
  memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer;
 }
 if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
  var data = Module["readBinary"](memoryInitializer);
  HEAPU8.set(data, STATIC_BASE);
 } else {
  addRunDependency("memory initializer");
  function applyMemoryInitializer(data) {
   if (data.byteLength) data = new Uint8Array(data);
   HEAPU8.set(data, STATIC_BASE);
   removeRunDependency("memory initializer");
  }
  var request = Module["memoryInitializerRequest"];
  if (request) {
   if (request.response) {
    setTimeout((function() {
     applyMemoryInitializer(request.response);
    }), 0);
   } else {
    request.addEventListener("load", (function() {
     if (request.status !== 200 && request.status !== 0) {
      console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status);
     }
     if (!request.response || typeof request.response !== "object" || !request.response.byteLength) {
      console.warn("a problem seems to have happened with Module.memoryInitializerRequest response (expected ArrayBuffer): " + request.response);
     }
     applyMemoryInitializer(request.response);
    }));
   }
  } else {
   Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, (function() {
    throw "could not load memory initializer " + memoryInitializer;
   }));
  }
 }
}
function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"]) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};
Module["callMain"] = Module.callMain = function callMain(args) {
 assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
 assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
 args = args || [];
 ensureInitRuntime();
 var argc = args.length + 1;
 function pad() {
  for (var i = 0; i < 4 - 1; i++) {
   argv.push(0);
  }
 }
 var argv = [ allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL) ];
 pad();
 for (var i = 0; i < argc - 1; i = i + 1) {
  argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
  pad();
 }
 argv.push(0);
 argv = allocate(argv, "i32", ALLOC_NORMAL);
 initialStackTop = STACKTOP;
 try {
  var ret = Module["_main"](argc, argv, 0);
  exit(ret);
 } catch (e) {
  if (e instanceof ExitStatus) {
   return;
  } else if (e == "SimulateInfiniteLoop") {
   Module["noExitRuntime"] = true;
   return;
  } else {
   if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [ e, e.stack ]);
   throw e;
  }
 } finally {
  calledMain = true;
 }
};
function run(args) {
 args = args || Module["arguments"];
 if (preloadStartTime === null) preloadStartTime = Date.now();
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
   Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms");
  }
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  if (Module["_main"] && shouldRunNow) Module["callMain"](args);
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout((function() {
   setTimeout((function() {
    Module["setStatus"]("");
   }), 1);
   doRun();
  }), 1);
 } else {
  doRun();
 }
}
Module["run"] = Module.run = run;
function exit(status) {
 if (Module["noExitRuntime"]) {
  return;
 }
 ABORT = true;
 EXITSTATUS = status;
 STACKTOP = initialStackTop;
 exitRuntime();
 if (Module["onExit"]) Module["onExit"](status);
 if (ENVIRONMENT_IS_NODE) {
  process["stdout"]["once"]("drain", (function() {
   process["exit"](status);
  }));
  console.log(" ");
  setTimeout((function() {
   process["exit"](status);
  }), 500);
 } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
  quit(status);
 }
 throw new ExitStatus(status);
}
Module["exit"] = Module.exit = exit;
var abortDecorators = [];
function abort(what) {
 if (what !== undefined) {
  Module.print(what);
  Module.printErr(what);
  what = JSON.stringify(what);
 } else {
  what = "";
 }
 ABORT = true;
 EXITSTATUS = 1;
 var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
 var output = "abort(" + what + ") at " + stackTrace() + extra;
 abortDecorators.forEach((function(decorator) {
  output = decorator(output, what);
 }));
 throw output;
}
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) {
 shouldRunNow = false;
}
run();




