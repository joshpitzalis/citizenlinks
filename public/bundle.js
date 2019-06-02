
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function validate_store(store, name) {
		if (!store || typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(component, store, callback) {
		const unsub = store.subscribe(callback);

		component.$$.on_destroy.push(unsub.unsubscribe
			? () => unsub.unsubscribe()
			: unsub);
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function prevent_default(fn) {
		return function(event) {
			event.preventDefault();
			return fn.call(this, event);
		};
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) return;
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	var obj;
	var NOTHING = typeof Symbol !== "undefined" ? Symbol("immer-nothing") : ( obj = {}, obj["immer-nothing"] = true, obj );
	var DRAFTABLE = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("immer-draftable") : "__$immer_draftable";
	var DRAFT_STATE = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("immer-state") : "__$immer_state";
	function isDraft(value) {
	  return !!value && !!value[DRAFT_STATE];
	}
	function isDraftable(value) {
	  if (!value || typeof value !== "object") { return false; }
	  if (Array.isArray(value)) { return true; }
	  var proto = Object.getPrototypeOf(value);
	  if (!proto || proto === Object.prototype) { return true; }
	  return !!value[DRAFTABLE] || !!value.constructor[DRAFTABLE];
	}
	var assign = Object.assign || function assign(target, value) {
	  for (var key in value) {
	    if (has(value, key)) {
	      target[key] = value[key];
	    }
	  }

	  return target;
	};
	var ownKeys = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys : typeof Object.getOwnPropertySymbols !== "undefined" ? function (obj) { return Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj)); } : Object.getOwnPropertyNames;
	function shallowCopy(base, invokeGetters) {
	  if ( invokeGetters === void 0 ) invokeGetters = false;

	  if (Array.isArray(base)) { return base.slice(); }
	  var clone = Object.create(Object.getPrototypeOf(base));
	  ownKeys(base).forEach(function (key) {
	    if (key === DRAFT_STATE) {
	      return; // Never copy over draft state.
	    }

	    var desc = Object.getOwnPropertyDescriptor(base, key);
	    var value = desc.value;

	    if (desc.get) {
	      if (!invokeGetters) {
	        throw new Error("Immer drafts cannot have computed properties");
	      }

	      value = desc.get.call(base);
	    }

	    if (desc.enumerable) {
	      clone[key] = value;
	    } else {
	      Object.defineProperty(clone, key, {
	        value: value,
	        writable: true,
	        configurable: true
	      });
	    }
	  });
	  return clone;
	}
	function each(value, cb) {
	  if (Array.isArray(value)) {
	    for (var i = 0; i < value.length; i++) { cb(i, value[i], value); }
	  } else {
	    ownKeys(value).forEach(function (key) { return cb(key, value[key], value); });
	  }
	}
	function isEnumerable(base, prop) {
	  var desc = Object.getOwnPropertyDescriptor(base, prop);
	  return !!desc && desc.enumerable;
	}
	function has(thing, prop) {
	  return Object.prototype.hasOwnProperty.call(thing, prop);
	}
	function is(x, y) {
	  // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
	  if (x === y) {
	    return x !== 0 || 1 / x === 1 / y;
	  } else {
	    return x !== x && y !== y;
	  }
	}

	/** Each scope represents a `produce` call. */

	var ImmerScope = function ImmerScope(parent) {
	  this.drafts = [];
	  this.parent = parent; // Whenever the modified draft contains a draft from another scope, we
	  // need to prevent auto-freezing so the unowned draft can be finalized.

	  this.canAutoFreeze = true; // To avoid prototype lookups:

	  this.patches = null;
	};

	ImmerScope.prototype.usePatches = function usePatches (patchListener) {
	  if (patchListener) {
	    this.patches = [];
	    this.inversePatches = [];
	    this.patchListener = patchListener;
	  }
	};

	ImmerScope.prototype.revoke = function revoke$1 () {
	  this.leave();
	  this.drafts.forEach(revoke);
	  this.drafts = null; // Make draft-related methods throw.
	};

	ImmerScope.prototype.leave = function leave () {
	  if (this === ImmerScope.current) {
	    ImmerScope.current = this.parent;
	  }
	};
	ImmerScope.current = null;

	ImmerScope.enter = function () {
	  return this.current = new ImmerScope(this.current);
	};

	function revoke(draft) {
	  draft[DRAFT_STATE].revoke();
	}

	// but share them all instead

	var descriptors = {};
	function willFinalize(scope, result, isReplaced) {
	  scope.drafts.forEach(function (draft) {
	    draft[DRAFT_STATE].finalizing = true;
	  });

	  if (!isReplaced) {
	    if (scope.patches) {
	      markChangesRecursively(scope.drafts[0]);
	    } // This is faster when we don't care about which attributes changed.


	    markChangesSweep(scope.drafts);
	  } // When a child draft is returned, look for changes.
	  else if (isDraft(result) && result[DRAFT_STATE].scope === scope) {
	      markChangesSweep(scope.drafts);
	    }
	}
	function createProxy(base, parent) {
	  var isArray = Array.isArray(base);
	  var draft = clonePotentialDraft(base);
	  each(draft, function (prop) {
	    proxyProperty(draft, prop, isArray || isEnumerable(base, prop));
	  }); // See "proxy.js" for property documentation.

	  var scope = parent ? parent.scope : ImmerScope.current;
	  var state = {
	    scope: scope,
	    modified: false,
	    finalizing: false,
	    // es5 only
	    finalized: false,
	    assigned: {},
	    parent: parent,
	    base: base,
	    draft: draft,
	    copy: null,
	    revoke: revoke$1,
	    revoked: false // es5 only

	  };
	  createHiddenProperty(draft, DRAFT_STATE, state);
	  scope.drafts.push(draft);
	  return draft;
	}

	function revoke$1() {
	  this.revoked = true;
	}

	function source(state) {
	  return state.copy || state.base;
	} // Access a property without creating an Immer draft.


	function peek(draft, prop) {
	  var state = draft[DRAFT_STATE];

	  if (state && !state.finalizing) {
	    state.finalizing = true;
	    var value = draft[prop];
	    state.finalizing = false;
	    return value;
	  }

	  return draft[prop];
	}

	function get(state, prop) {
	  assertUnrevoked(state);
	  var value = peek(source(state), prop);
	  if (state.finalizing) { return value; } // Create a draft if the value is unmodified.

	  if (value === peek(state.base, prop) && isDraftable(value)) {
	    prepareCopy(state);
	    return state.copy[prop] = createProxy(value, state);
	  }

	  return value;
	}

	function set(state, prop, value) {
	  assertUnrevoked(state);
	  state.assigned[prop] = true;

	  if (!state.modified) {
	    if (is(value, peek(source(state), prop))) { return; }
	    markChanged(state);
	    prepareCopy(state);
	  }

	  state.copy[prop] = value;
	}

	function markChanged(state) {
	  if (!state.modified) {
	    state.modified = true;
	    if (state.parent) { markChanged(state.parent); }
	  }
	}

	function prepareCopy(state) {
	  if (!state.copy) { state.copy = clonePotentialDraft(state.base); }
	}

	function clonePotentialDraft(base) {
	  var state = base && base[DRAFT_STATE];

	  if (state) {
	    state.finalizing = true;
	    var draft = shallowCopy(state.draft, true);
	    state.finalizing = false;
	    return draft;
	  }

	  return shallowCopy(base);
	}

	function proxyProperty(draft, prop, enumerable) {
	  var desc = descriptors[prop];

	  if (desc) {
	    desc.enumerable = enumerable;
	  } else {
	    descriptors[prop] = desc = {
	      configurable: true,
	      enumerable: enumerable,

	      get: function get$1() {
	        return get(this[DRAFT_STATE], prop);
	      },

	      set: function set$1(value) {
	        set(this[DRAFT_STATE], prop, value);
	      }

	    };
	  }

	  Object.defineProperty(draft, prop, desc);
	}

	function assertUnrevoked(state) {
	  if (state.revoked === true) { throw new Error("Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + JSON.stringify(source(state))); }
	} // This looks expensive, but only proxies are visited, and only objects without known changes are scanned.


	function markChangesSweep(drafts) {
	  // The natural order of drafts in the `scope` array is based on when they
	  // were accessed. By processing drafts in reverse natural order, we have a
	  // better chance of processing leaf nodes first. When a leaf node is known to
	  // have changed, we can avoid any traversal of its ancestor nodes.
	  for (var i = drafts.length - 1; i >= 0; i--) {
	    var state = drafts[i][DRAFT_STATE];

	    if (!state.modified) {
	      if (Array.isArray(state.base)) {
	        if (hasArrayChanges(state)) { markChanged(state); }
	      } else if (hasObjectChanges(state)) { markChanged(state); }
	    }
	  }
	}

	function markChangesRecursively(object) {
	  if (!object || typeof object !== "object") { return; }
	  var state = object[DRAFT_STATE];
	  if (!state) { return; }
	  var base = state.base;
	  var draft = state.draft;
	  var assigned = state.assigned;

	  if (!Array.isArray(object)) {
	    // Look for added keys.
	    Object.keys(draft).forEach(function (key) {
	      // The `undefined` check is a fast path for pre-existing keys.
	      if (base[key] === undefined && !has(base, key)) {
	        assigned[key] = true;
	        markChanged(state);
	      } else if (!assigned[key]) {
	        // Only untouched properties trigger recursion.
	        markChangesRecursively(draft[key]);
	      }
	    }); // Look for removed keys.

	    Object.keys(base).forEach(function (key) {
	      // The `undefined` check is a fast path for pre-existing keys.
	      if (draft[key] === undefined && !has(draft, key)) {
	        assigned[key] = false;
	        markChanged(state);
	      }
	    });
	  } else if (hasArrayChanges(state)) {
	    markChanged(state);
	    assigned.length = true;

	    if (draft.length < base.length) {
	      for (var i = draft.length; i < base.length; i++) { assigned[i] = false; }
	    } else {
	      for (var i$1 = base.length; i$1 < draft.length; i$1++) { assigned[i$1] = true; }
	    }

	    for (var i$2 = 0; i$2 < draft.length; i$2++) {
	      // Only untouched indices trigger recursion.
	      if (assigned[i$2] === undefined) { markChangesRecursively(draft[i$2]); }
	    }
	  }
	}

	function hasObjectChanges(state) {
	  var base = state.base;
	  var draft = state.draft; // Search for added keys and changed keys. Start at the back, because
	  // non-numeric keys are ordered by time of definition on the object.

	  var keys = Object.keys(draft);

	  for (var i = keys.length - 1; i >= 0; i--) {
	    var key = keys[i];
	    var baseValue = base[key]; // The `undefined` check is a fast path for pre-existing keys.

	    if (baseValue === undefined && !has(base, key)) {
	      return true;
	    } // Once a base key is deleted, future changes go undetected, because its
	    // descriptor is erased. This branch detects any missed changes.
	    else {
	        var value = draft[key];
	        var state$1 = value && value[DRAFT_STATE];

	        if (state$1 ? state$1.base !== baseValue : !is(value, baseValue)) {
	          return true;
	        }
	      }
	  } // At this point, no keys were added or changed.
	  // Compare key count to determine if keys were deleted.


	  return keys.length !== Object.keys(base).length;
	}

	function hasArrayChanges(state) {
	  var draft = state.draft;
	  if (draft.length !== state.base.length) { return true; } // See #116
	  // If we first shorten the length, our array interceptors will be removed.
	  // If after that new items are added, result in the same original length,
	  // those last items will have no intercepting property.
	  // So if there is no own descriptor on the last position, we know that items were removed and added
	  // N.B.: splice, unshift, etc only shift values around, but not prop descriptors, so we only have to check
	  // the last one

	  var descriptor = Object.getOwnPropertyDescriptor(draft, draft.length - 1); // descriptor can be null, but only for newly created sparse arrays, eg. new Array(10)

	  if (descriptor && !descriptor.get) { return true; } // For all other cases, we don't have to compare, as they would have been picked up by the index setters

	  return false;
	}

	function createHiddenProperty(target, prop, value) {
	  Object.defineProperty(target, prop, {
	    value: value,
	    enumerable: false,
	    writable: true
	  });
	}

	var legacyProxy = /*#__PURE__*/Object.freeze({
	    willFinalize: willFinalize,
	    createProxy: createProxy
	});

	function willFinalize$1() {}
	function createProxy$1(base, parent) {
	  var scope = parent ? parent.scope : ImmerScope.current;
	  var state = {
	    // Track which produce call this is associated with.
	    scope: scope,
	    // True for both shallow and deep changes.
	    modified: false,
	    // Used during finalization.
	    finalized: false,
	    // Track which properties have been assigned (true) or deleted (false).
	    assigned: {},
	    // The parent draft state.
	    parent: parent,
	    // The base state.
	    base: base,
	    // The base proxy.
	    draft: null,
	    // Any property proxies.
	    drafts: {},
	    // The base copy with any updated values.
	    copy: null,
	    // Called by the `produce` function.
	    revoke: null
	  };
	  var ref = Array.isArray(base) ? // [state] is used for arrays, to make sure the proxy is array-ish and not violate invariants,
	  // although state itself is an object
	  Proxy.revocable([state], arrayTraps) : Proxy.revocable(state, objectTraps);
	  var revoke = ref.revoke;
	  var proxy = ref.proxy;
	  state.draft = proxy;
	  state.revoke = revoke;
	  scope.drafts.push(proxy);
	  return proxy;
	}
	var objectTraps = {
	  get: get$1,

	  has: function has(target, prop) {
	    return prop in source$1(target);
	  },

	  ownKeys: function ownKeys(target) {
	    return Reflect.ownKeys(source$1(target));
	  },

	  set: set$1,
	  deleteProperty: deleteProperty,
	  getOwnPropertyDescriptor: getOwnPropertyDescriptor,

	  defineProperty: function defineProperty() {
	    throw new Error("Object.defineProperty() cannot be used on an Immer draft"); // prettier-ignore
	  },

	  getPrototypeOf: function getPrototypeOf(target) {
	    return Object.getPrototypeOf(target.base);
	  },

	  setPrototypeOf: function setPrototypeOf() {
	    throw new Error("Object.setPrototypeOf() cannot be used on an Immer draft"); // prettier-ignore
	  }

	};
	var arrayTraps = {};
	each(objectTraps, function (key, fn) {
	  arrayTraps[key] = function () {
	    arguments[0] = arguments[0][0];
	    return fn.apply(this, arguments);
	  };
	});

	arrayTraps.deleteProperty = function (state, prop) {
	  if (isNaN(parseInt(prop))) {
	    throw new Error("Immer only supports deleting array indices"); // prettier-ignore
	  }

	  return objectTraps.deleteProperty.call(this, state[0], prop);
	};

	arrayTraps.set = function (state, prop, value) {
	  if (prop !== "length" && isNaN(parseInt(prop))) {
	    throw new Error("Immer only supports setting array indices and the 'length' property"); // prettier-ignore
	  }

	  return objectTraps.set.call(this, state[0], prop, value);
	}; // returns the object we should be reading the current value from, which is base, until some change has been made


	function source$1(state) {
	  return state.copy || state.base;
	} // Access a property without creating an Immer draft.


	function peek$1(draft, prop) {
	  var state = draft[DRAFT_STATE];
	  var desc = Reflect.getOwnPropertyDescriptor(state ? source$1(state) : draft, prop);
	  return desc && desc.value;
	}

	function get$1(state, prop) {
	  if (prop === DRAFT_STATE) { return state; }
	  var drafts = state.drafts; // Check for existing draft in unmodified state.

	  if (!state.modified && has(drafts, prop)) {
	    return drafts[prop];
	  }

	  var value = source$1(state)[prop];

	  if (state.finalized || !isDraftable(value)) {
	    return value;
	  } // Check for existing draft in modified state.


	  if (state.modified) {
	    // Assigned values are never drafted. This catches any drafts we created, too.
	    if (value !== peek$1(state.base, prop)) { return value; } // Store drafts on the copy (when one exists).

	    drafts = state.copy;
	  }

	  return drafts[prop] = createProxy$1(value, state);
	}

	function set$1(state, prop, value) {
	  if (!state.modified) {
	    var baseValue = peek$1(state.base, prop); // Optimize based on value's truthiness. Truthy values are guaranteed to
	    // never be undefined, so we can avoid the `in` operator. Lastly, truthy
	    // values may be drafts, but falsy values are never drafts.

	    var isUnchanged = value ? is(baseValue, value) || value === state.drafts[prop] : is(baseValue, value) && prop in state.base;
	    if (isUnchanged) { return true; }
	    markChanged$1(state);
	  }

	  state.assigned[prop] = true;
	  state.copy[prop] = value;
	  return true;
	}

	function deleteProperty(state, prop) {
	  // The `undefined` check is a fast path for pre-existing keys.
	  if (peek$1(state.base, prop) !== undefined || prop in state.base) {
	    state.assigned[prop] = false;
	    markChanged$1(state);
	  }

	  if (state.copy) { delete state.copy[prop]; }
	  return true;
	} // Note: We never coerce `desc.value` into an Immer draft, because we can't make
	// the same guarantee in ES5 mode.


	function getOwnPropertyDescriptor(state, prop) {
	  var owner = source$1(state);
	  var desc = Reflect.getOwnPropertyDescriptor(owner, prop);

	  if (desc) {
	    desc.writable = true;
	    desc.configurable = !Array.isArray(owner) || prop !== "length";
	  }

	  return desc;
	}

	function markChanged$1(state) {
	  if (!state.modified) {
	    state.modified = true;
	    state.copy = assign(shallowCopy(state.base), state.drafts);
	    state.drafts = null;
	    if (state.parent) { markChanged$1(state.parent); }
	  }
	}

	var modernProxy = /*#__PURE__*/Object.freeze({
	    willFinalize: willFinalize$1,
	    createProxy: createProxy$1
	});

	function generatePatches(state, basePath, patches, inversePatches) {
	  Array.isArray(state.base) ? generateArrayPatches(state, basePath, patches, inversePatches) : generateObjectPatches(state, basePath, patches, inversePatches);
	}

	function generateArrayPatches(state, basePath, patches, inversePatches) {
	  var assign, assign$1;

	  var base = state.base;
	  var copy = state.copy;
	  var assigned = state.assigned; // Reduce complexity by ensuring `base` is never longer.

	  if (copy.length < base.length) {
	    (assign = [copy, base], base = assign[0], copy = assign[1]);
	    (assign$1 = [inversePatches, patches], patches = assign$1[0], inversePatches = assign$1[1]);
	  }

	  var delta = copy.length - base.length; // Find the first replaced index.

	  var start = 0;

	  while (base[start] === copy[start] && start < base.length) {
	    ++start;
	  } // Find the last replaced index. Search from the end to optimize splice patches.


	  var end = base.length;

	  while (end > start && base[end - 1] === copy[end + delta - 1]) {
	    --end;
	  } // Process replaced indices.


	  for (var i = start; i < end; ++i) {
	    if (assigned[i] && copy[i] !== base[i]) {
	      var path = basePath.concat([i]);
	      patches.push({
	        op: "replace",
	        path: path,
	        value: copy[i]
	      });
	      inversePatches.push({
	        op: "replace",
	        path: path,
	        value: base[i]
	      });
	    }
	  }

	  var useRemove = end != base.length;
	  var replaceCount = patches.length; // Process added indices.

	  for (var i$1 = end + delta - 1; i$1 >= end; --i$1) {
	    var path$1 = basePath.concat([i$1]);
	    patches[replaceCount + i$1 - end] = {
	      op: "add",
	      path: path$1,
	      value: copy[i$1]
	    };

	    if (useRemove) {
	      inversePatches.push({
	        op: "remove",
	        path: path$1
	      });
	    }
	  } // One "replace" patch reverses all non-splicing "add" patches.


	  if (!useRemove) {
	    inversePatches.push({
	      op: "replace",
	      path: basePath.concat(["length"]),
	      value: base.length
	    });
	  }
	}

	function generateObjectPatches(state, basePath, patches, inversePatches) {
	  var base = state.base;
	  var copy = state.copy;
	  each(state.assigned, function (key, assignedValue) {
	    var origValue = base[key];
	    var value = copy[key];
	    var op = !assignedValue ? "remove" : key in base ? "replace" : "add";
	    if (origValue === value && op === "replace") { return; }
	    var path = basePath.concat(key);
	    patches.push(op === "remove" ? {
	      op: op,
	      path: path
	    } : {
	      op: op,
	      path: path,
	      value: value
	    });
	    inversePatches.push(op === "add" ? {
	      op: "remove",
	      path: path
	    } : op === "remove" ? {
	      op: "add",
	      path: path,
	      value: origValue
	    } : {
	      op: "replace",
	      path: path,
	      value: origValue
	    });
	  });
	}

	function applyPatches(draft, patches) {
	  for (var i = 0; i < patches.length; i++) {
	    var patch = patches[i];
	    var path = patch.path;

	    if (path.length === 0 && patch.op === "replace") {
	      draft = patch.value;
	    } else {
	      var base = draft;

	      for (var i$1 = 0; i$1 < path.length - 1; i$1++) {
	        base = base[path[i$1]];
	        if (!base || typeof base !== "object") { throw new Error("Cannot apply patch, path doesn't resolve: " + path.join("/")); } // prettier-ignore
	      }

	      var key = path[path.length - 1];

	      switch (patch.op) {
	        case "replace":
	          base[key] = patch.value;
	          break;

	        case "add":
	          if (Array.isArray(base)) {
	            // TODO: support "foo/-" paths for appending to an array
	            base.splice(key, 0, patch.value);
	          } else {
	            base[key] = patch.value;
	          }

	          break;

	        case "remove":
	          if (Array.isArray(base)) {
	            base.splice(key, 1);
	          } else {
	            delete base[key];
	          }

	          break;

	        default:
	          throw new Error("Unsupported patch operation: " + patch.op);
	      }
	    }
	  }

	  return draft;
	}

	function verifyMinified() {}

	var configDefaults = {
	  useProxies: typeof Proxy !== "undefined" && typeof Reflect !== "undefined",
	  autoFreeze: typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : verifyMinified.name === "verifyMinified",
	  onAssign: null,
	  onDelete: null,
	  onCopy: null
	};
	var Immer = function Immer(config) {
	  assign(this, configDefaults, config);
	  this.setUseProxies(this.useProxies);
	  this.produce = this.produce.bind(this);
	};

	Immer.prototype.produce = function produce (base, recipe, patchListener) {
	    var this$1 = this;

	  // curried invocation
	  if (typeof base === "function" && typeof recipe !== "function") {
	    var defaultBase = recipe;
	    recipe = base;
	    var self = this;
	    return function curriedProduce(base) {
	        var this$1 = this;
	        if ( base === void 0 ) base = defaultBase;
	        var args = [], len = arguments.length - 1;
	        while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

	      return self.produce(base, function (draft) { return recipe.call.apply(recipe, [ this$1, draft ].concat( args )); }); // prettier-ignore
	    };
	  } // prettier-ignore


	  {
	    if (typeof recipe !== "function") {
	      throw new Error("The first or second argument to `produce` must be a function");
	    }

	    if (patchListener !== undefined && typeof patchListener !== "function") {
	      throw new Error("The third argument to `produce` must be a function or undefined");
	    }
	  }
	  var result; // Only plain objects, arrays, and "immerable classes" are drafted.

	  if (isDraftable(base)) {
	    var scope = ImmerScope.enter();
	    var proxy = this.createProxy(base);
	    var hasError = true;

	    try {
	      result = recipe(proxy);
	      hasError = false;
	    } finally {
	      // finally instead of catch + rethrow better preserves original stack
	      if (hasError) { scope.revoke(); }else { scope.leave(); }
	    }

	    if (result instanceof Promise) {
	      return result.then(function (result) {
	        scope.usePatches(patchListener);
	        return this$1.processResult(result, scope);
	      }, function (error) {
	        scope.revoke();
	        throw error;
	      });
	    }

	    scope.usePatches(patchListener);
	    return this.processResult(result, scope);
	  } else {
	    result = recipe(base);
	    if (result === undefined) { return base; }
	    return result !== NOTHING ? result : undefined;
	  }
	};

	Immer.prototype.createDraft = function createDraft (base) {
	  if (!isDraftable(base)) {
	    throw new Error("First argument to `createDraft` must be a plain object, an array, or an immerable object"); // prettier-ignore
	  }

	  var scope = ImmerScope.enter();
	  var proxy = this.createProxy(base);
	  proxy[DRAFT_STATE].isManual = true;
	  scope.leave();
	  return proxy;
	};

	Immer.prototype.finishDraft = function finishDraft (draft, patchListener) {
	  var state = draft && draft[DRAFT_STATE];

	  if (!state || !state.isManual) {
	    throw new Error("First argument to `finishDraft` must be a draft returned by `createDraft`"); // prettier-ignore
	  }

	  if (state.finalized) {
	    throw new Error("The given draft is already finalized"); // prettier-ignore
	  }

	  var scope = state.scope;
	  scope.usePatches(patchListener);
	  return this.processResult(undefined, scope);
	};

	Immer.prototype.setAutoFreeze = function setAutoFreeze (value) {
	  this.autoFreeze = value;
	};

	Immer.prototype.setUseProxies = function setUseProxies (value) {
	  this.useProxies = value;
	  assign(this, value ? modernProxy : legacyProxy);
	};

	Immer.prototype.applyPatches = function applyPatches$1 (base, patches) {
	  // Mutate the base state when a draft is passed.
	  if (isDraft(base)) {
	    return applyPatches(base, patches);
	  } // Otherwise, produce a copy of the base state.


	  return this.produce(base, function (draft) { return applyPatches(draft, patches); });
	};
	/** @internal */


	Immer.prototype.processResult = function processResult (result, scope) {
	  var baseDraft = scope.drafts[0];
	  var isReplaced = result !== undefined && result !== baseDraft;
	  this.willFinalize(scope, result, isReplaced);

	  if (isReplaced) {
	    if (baseDraft[DRAFT_STATE].modified) {
	      scope.revoke();
	      throw new Error("An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft."); // prettier-ignore
	    }

	    if (isDraftable(result)) {
	      // Finalize the result in case it contains (or is) a subset of the draft.
	      result = this.finalize(result, null, scope);
	    }

	    if (scope.patches) {
	      scope.patches.push({
	        op: "replace",
	        path: [],
	        value: result
	      });
	      scope.inversePatches.push({
	        op: "replace",
	        path: [],
	        value: baseDraft[DRAFT_STATE].base
	      });
	    }
	  } else {
	    // Finalize the base draft.
	    result = this.finalize(baseDraft, [], scope);
	  }

	  scope.revoke();

	  if (scope.patches) {
	    scope.patchListener(scope.patches, scope.inversePatches);
	  }

	  return result !== NOTHING ? result : undefined;
	};
	/**
	 * @internal
	 * Finalize a draft, returning either the unmodified base state or a modified
	 * copy of the base state.
	 */


	Immer.prototype.finalize = function finalize (draft, path, scope) {
	    var this$1 = this;

	  var state = draft[DRAFT_STATE];

	  if (!state) {
	    if (Object.isFrozen(draft)) { return draft; }
	    return this.finalizeTree(draft, null, scope);
	  } // Never finalize drafts owned by another scope.


	  if (state.scope !== scope) {
	    return draft;
	  }

	  if (!state.modified) {
	    return state.base;
	  }

	  if (!state.finalized) {
	    state.finalized = true;
	    this.finalizeTree(state.draft, path, scope);

	    if (this.onDelete) {
	      // The `assigned` object is unreliable with ES5 drafts.
	      if (this.useProxies) {
	        var assigned = state.assigned;

	        for (var prop in assigned) {
	          if (!assigned[prop]) { this.onDelete(state, prop); }
	        }
	      } else {
	        var base = state.base;
	          var copy = state.copy;
	        each(base, function (prop) {
	          if (!has(copy, prop)) { this$1.onDelete(state, prop); }
	        });
	      }
	    }

	    if (this.onCopy) {
	      this.onCopy(state);
	    } // At this point, all descendants of `state.copy` have been finalized,
	    // so we can be sure that `scope.canAutoFreeze` is accurate.


	    if (this.autoFreeze && scope.canAutoFreeze) {
	      Object.freeze(state.copy);
	    }

	    if (path && scope.patches) {
	      generatePatches(state, path, scope.patches, scope.inversePatches);
	    }
	  }

	  return state.copy;
	};
	/**
	 * @internal
	 * Finalize all drafts in the given state tree.
	 */


	Immer.prototype.finalizeTree = function finalizeTree (root, rootPath, scope) {
	    var this$1 = this;

	  var state = root[DRAFT_STATE];

	  if (state) {
	    if (!this.useProxies) {
	      // Create the final copy, with added keys and without deleted keys.
	      state.copy = shallowCopy(state.draft, true);
	    }

	    root = state.copy;
	  }

	  var needPatches = !!rootPath && !!scope.patches;

	  var finalizeProperty = function (prop, value, parent) {
	    if (value === parent) {
	      throw Error("Immer forbids circular references");
	    } // In the `finalizeTree` method, only the `root` object may be a draft.


	    var isDraftProp = !!state && parent === root;

	    if (isDraft(value)) {
	      var path = isDraftProp && needPatches && !state.assigned[prop] ? rootPath.concat(prop) : null; // Drafts owned by `scope` are finalized here.

	      value = this$1.finalize(value, path, scope); // Drafts from another scope must prevent auto-freezing.

	      if (isDraft(value)) {
	        scope.canAutoFreeze = false;
	      } // Preserve non-enumerable properties.


	      if (Array.isArray(parent) || isEnumerable(parent, prop)) {
	        parent[prop] = value;
	      } else {
	        Object.defineProperty(parent, prop, {
	          value: value
	        });
	      } // Unchanged drafts are never passed to the `onAssign` hook.


	      if (isDraftProp && value === state.base[prop]) { return; }
	    } // Unchanged draft properties are ignored.
	    else if (isDraftProp && is(value, state.base[prop])) {
	        return;
	      } // Search new objects for unfinalized drafts. Frozen objects should never contain drafts.
	      else if (isDraftable(value) && !Object.isFrozen(value)) {
	          each(value, finalizeProperty);
	        }

	    if (isDraftProp && this$1.onAssign) {
	      this$1.onAssign(state, prop, value);
	    }
	  };

	  each(root, finalizeProperty);
	  return root;
	};

	var immer = new Immer();
	/**
	 * The `produce` function takes a value and a "recipe function" (whose
	 * return value often depends on the base state). The recipe function is
	 * free to mutate its first argument however it wants. All mutations are
	 * only ever applied to a __copy__ of the base state.
	 *
	 * Pass only a function to create a "curried producer" which relieves you
	 * from passing the recipe function every time.
	 *
	 * Only plain objects and arrays are made mutable. All other objects are
	 * considered uncopyable.
	 *
	 * Note: This function is __bound__ to its `Immer` instance.
	 *
	 * @param {any} base - the initial state
	 * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
	 * @param {Function} patchListener - optional function that will be called with all the patches produced here
	 * @returns {any} a new state, or the initial state if nothing was modified
	 */

	var produce = immer.produce;
	/**
	 * Pass true to automatically freeze all copies created by Immer.
	 *
	 * By default, auto-freezing is disabled in production.
	 */

	var setAutoFreeze = immer.setAutoFreeze.bind(immer);
	/**
	 * Pass true to use the ES2015 `Proxy` class when creating drafts, which is
	 * always faster than using ES5 proxies.
	 *
	 * By default, feature detection is used, so calling this is rarely necessary.
	 */

	var setUseProxies = immer.setUseProxies.bind(immer);
	/**
	 * Apply an array of Immer patches to the first argument.
	 *
	 * This function is a producer, which means copy-on-write is in effect.
	 */

	var applyPatches$1 = immer.applyPatches.bind(immer);
	/**
	 * Create an Immer draft from the given base state, which may be a draft itself.
	 * The draft can be modified until you finalize it with the `finishDraft` function.
	 */

	var createDraft = immer.createDraft.bind(immer);
	/**
	 * Finalize an Immer draft from a `createDraft` call, returning the base state
	 * (if no changes were made) or a modified copy. The draft must *not* be
	 * mutated afterwards.
	 *
	 * Pass a function as the 2nd argument to generate Immer patches based on the
	 * changes that were made.
	 */

	var finishDraft = immer.finishDraft.bind(immer);
	//# sourceMappingURL=immer.module.js.map

	function writable(value, start = noop) {
		let stop;
		const subscribers = [];

		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (!stop) return; // not ready
				subscribers.forEach(s => s[1]());
				subscribers.forEach(s => s[0](value));
			}
		}

		function update(fn) {
			set(fn(value));
		}

		function subscribe(run, invalidate = noop) {
			const subscriber = [run, invalidate];
			subscribers.push(subscriber);
			if (subscribers.length === 1) stop = start(set) || noop;
			run(value);

			return () => {
				const index = subscribers.indexOf(subscriber);
				if (index !== -1) subscribers.splice(index, 1);
				if (subscribers.length === 0) stop();
			};
		}

		return { set, update, subscribe };
	}

	const meetups = writable([
	  {
	    id: "a",
	    title: "Giant Whale Invests Huge Money to Build a ComputerOut of Plankton",
	    subtitle: "c",
	    description: "d",
	    imageURL: "http://mrmrs.github.io/photos/whale.jpg",
	    address: "e",
	    contact: "f",
	    isFavourite: true
	  },
	  {
	    id: "a22",
	    title: "b2s",
	    subtitle: "c",
	    description: "d",
	    imageURL: "d",
	    address: "e",
	    contact: "f",
	    isFavourite: false
	  }
	]);

	const addMeetup = () => {
	  // https://github.com/immerjs/immer

	  newMeetups = produce(meetups, draft => {
	    draft.push({
	      id: Math.random().toString(),
	      isFavourite: false,
	      ...newMeetup
	    });
	  });

	  meetups.update(newMeetups);
	};

	const toggleFavourite = id =>
	  meetups.update(items =>
	    produce(items, draft => {
	      const index = draft.findIndex(meet => meet.id === id);
	      draft[index].isFavourite = !draft[index].isFavourite;
	    })
	  );

	const customMeetupsStore = {
	  subscribe: meetups.subscribe,
	  addMeetup,
	  toggleFavourite
	};

	const isEmpty = val => val.trim().length === 0;

	const isValidEmail = val => val.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

	/* src/components/TextInput.svelte generated by Svelte v3.3.0 */

	const file = "src/components/TextInput.svelte";

	// (24:2) {#if error}
	function create_if_block(ctx) {
		var p, t_value = `Please enter a valid ${ctx.title}.`, t;

		return {
			c: function create() {
				p = element("p");
				t = text(t_value);
				p.className = "red";
				add_location(p, file, 24, 2, 469);
			},

			m: function mount(target, anchor) {
				insert(target, p, anchor);
				append(p, t);
			},

			p: function update(changed, ctx) {
				if ((changed.title) && t_value !== (t_value = `Please enter a valid ${ctx.title}.`)) {
					set_data(t, t_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(p);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var div, label, t0, t1, input, t2, dispose;

		var if_block = (ctx.error) && create_if_block(ctx);

		return {
			c: function create() {
				div = element("div");
				label = element("label");
				t0 = text(ctx.title);
				t1 = space();
				input = element("input");
				t2 = space();
				if (if_block) if_block.c();
				label.className = "db fw6 lh-copy f6";
				label.htmlFor = ctx.title;
				add_location(label, file, 12, 2, 178);
				input.className = "pa2 input-reset ba bg-transparent hover-bg-black hover-white\n  w-100";
				attr(input, "type", "text");
				input.name = ctx.title;
				input.id = ctx.title;
				input.required = true;
				add_location(input, file, 13, 2, 243);
				div.className = "mt3";
				add_location(div, file, 11, 0, 158);

				dispose = [
					listen(input, "input", ctx.input_input_handler),
					listen(input, "blur", ctx.blur_handler)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, label);
				append(label, t0);
				append(div, t1);
				append(div, input);

				input.value = ctx.value;

				append(div, t2);
				if (if_block) if_block.m(div, null);
			},

			p: function update(changed, ctx) {
				if (changed.title) {
					set_data(t0, ctx.title);
					label.htmlFor = ctx.title;
				}

				if (changed.value && (input.value !== ctx.value)) input.value = ctx.value;

				if (changed.title) {
					input.name = ctx.title;
					input.id = ctx.title;
				}

				if (ctx.error) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if (if_block) if_block.d();
				run_all(dispose);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { value, title, valid } = $$props;

	  let touched = false;
	  let error = false;

		function input_input_handler() {
			value = this.value;
			$$invalidate('value', value);
		}

		function blur_handler() {
			const $$result = touched = true;
			$$invalidate('touched', touched);
			return $$result;
		}

		$$self.$set = $$props => {
			if ('value' in $$props) $$invalidate('value', value = $$props.value);
			if ('title' in $$props) $$invalidate('title', title = $$props.title);
			if ('valid' in $$props) $$invalidate('valid', valid = $$props.valid);
		};

		$$self.$$.update = ($$dirty = { valid: 1, touched: 1 }) => {
			if ($$dirty.valid || $$dirty.touched) { $$invalidate('error', error = !valid && touched); }
		};

		return {
			value,
			title,
			valid,
			touched,
			error,
			input_input_handler,
			blur_handler
		};
	}

	class TextInput extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["value", "title", "valid"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.value === undefined && !('value' in props)) {
				console.warn("<TextInput> was created without expected prop 'value'");
			}
			if (ctx.title === undefined && !('title' in props)) {
				console.warn("<TextInput> was created without expected prop 'title'");
			}
			if (ctx.valid === undefined && !('valid' in props)) {
				console.warn("<TextInput> was created without expected prop 'valid'");
			}
		}

		get value() {
			throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set value(value) {
			throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get title() {
			throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set title(value) {
			throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get valid() {
			throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set valid(value) {
			throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/features/meetups/createForm.svelte generated by Svelte v3.3.0 */

	const file$1 = "src/features/meetups/createForm.svelte";

	function create_fragment$1(ctx) {
		var form, fieldset, legend, t1, updating_value, t2, updating_value_1, t3, div0, label, t5, textarea, t6, updating_value_2, t7, updating_value_3, t8, updating_value_4, t9, div1, input, input_disabled_value, current, dispose;

		function textinput0_value_binding(value) {
			ctx.textinput0_value_binding.call(null, value);
			updating_value = true;
			add_flush_callback(() => updating_value = false);
		}

		let textinput0_props = { title: "Name", valid: !isEmpty(ctx.title) };
		if (ctx.title !== void 0) {
			textinput0_props.value = ctx.title;
		}
		var textinput0 = new TextInput({ props: textinput0_props, $$inline: true });

		add_binding_callback(() => bind(textinput0, 'value', textinput0_value_binding));

		function textinput1_value_binding(value_1) {
			ctx.textinput1_value_binding.call(null, value_1);
			updating_value_1 = true;
			add_flush_callback(() => updating_value_1 = false);
		}

		let textinput1_props = { title: "Subtitle", valid: true };
		if (ctx.subtitle !== void 0) {
			textinput1_props.value = ctx.subtitle;
		}
		var textinput1 = new TextInput({ props: textinput1_props, $$inline: true });

		add_binding_callback(() => bind(textinput1, 'value', textinput1_value_binding));

		function textinput2_value_binding(value_2) {
			ctx.textinput2_value_binding.call(null, value_2);
			updating_value_2 = true;
			add_flush_callback(() => updating_value_2 = false);
		}

		let textinput2_props = { title: "Image URL", valid: true };
		if (ctx.imageURL !== void 0) {
			textinput2_props.value = ctx.imageURL;
		}
		var textinput2 = new TextInput({ props: textinput2_props, $$inline: true });

		add_binding_callback(() => bind(textinput2, 'value', textinput2_value_binding));

		function textinput3_value_binding(value_3) {
			ctx.textinput3_value_binding.call(null, value_3);
			updating_value_3 = true;
			add_flush_callback(() => updating_value_3 = false);
		}

		let textinput3_props = { title: "Address", valid: true };
		if (ctx.address !== void 0) {
			textinput3_props.value = ctx.address;
		}
		var textinput3 = new TextInput({ props: textinput3_props, $$inline: true });

		add_binding_callback(() => bind(textinput3, 'value', textinput3_value_binding));

		function textinput4_value_binding(value_4) {
			ctx.textinput4_value_binding.call(null, value_4);
			updating_value_4 = true;
			add_flush_callback(() => updating_value_4 = false);
		}

		let textinput4_props = {
			title: "Contact Email",
			valid: isValidEmail(ctx.contact) && !isEmpty(ctx.contact)
		};
		if (ctx.contact !== void 0) {
			textinput4_props.value = ctx.contact;
		}
		var textinput4 = new TextInput({ props: textinput4_props, $$inline: true });

		add_binding_callback(() => bind(textinput4, 'value', textinput4_value_binding));

		return {
			c: function create() {
				form = element("form");
				fieldset = element("fieldset");
				legend = element("legend");
				legend.textContent = "Create a Meetup";
				t1 = space();
				textinput0.$$.fragment.c();
				t2 = space();
				textinput1.$$.fragment.c();
				t3 = space();
				div0 = element("div");
				label = element("label");
				label.textContent = "Description";
				t5 = space();
				textarea = element("textarea");
				t6 = space();
				textinput2.$$.fragment.c();
				t7 = space();
				textinput3.$$.fragment.c();
				t8 = space();
				textinput4.$$.fragment.c();
				t9 = space();
				div1 = element("div");
				input = element("input");
				legend.className = "f4 fw6 ph0 mh0";
				add_location(legend, file$1, 40, 4, 849);
				label.className = "db fw6 lh-copy f6";
				label.htmlFor = "description";
				add_location(label, file$1, 48, 6, 1092);
				textarea.className = "b pa2 input-reset ba bg-transparent hover-bg-black hover-white w-100";
				attr(textarea, "type", "text");
				textarea.name = "";
				textarea.id = "description";
				add_location(textarea, file$1, 49, 6, 1169);
				div0.className = "mv3";
				add_location(div0, file$1, 47, 4, 1068);
				fieldset.id = "sign_up";
				fieldset.className = "ba b--transparent ph0 mh0";
				add_location(fieldset, file$1, 39, 2, 787);
				input.className = "b ph3 pv2 input-reset ba b--black bg-transparent grow pointer f6 dib";
				attr(input, "type", "submit");
				input.value = "Create Meetup";
				input.disabled = input_disabled_value = !isValidEmail(ctx.contact) || isEmpty(ctx.contact) ||isEmpty(ctx.title);
				add_location(input, file$1, 65, 4, 1689);
				div1.className = "";
				add_location(div1, file$1, 64, 2, 1670);
				form.className = "measure center";
				add_location(form, file$1, 35, 0, 698);

				dispose = [
					listen(textarea, "input", ctx.textarea_input_handler),
					listen(form, "submit", prevent_default(ctx.submit_handler))
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, form, anchor);
				append(form, fieldset);
				append(fieldset, legend);
				append(fieldset, t1);
				mount_component(textinput0, fieldset, null);
				append(fieldset, t2);
				mount_component(textinput1, fieldset, null);
				append(fieldset, t3);
				append(fieldset, div0);
				append(div0, label);
				append(div0, t5);
				append(div0, textarea);

				textarea.value = ctx.description;

				append(fieldset, t6);
				mount_component(textinput2, fieldset, null);
				append(fieldset, t7);
				mount_component(textinput3, fieldset, null);
				append(fieldset, t8);
				mount_component(textinput4, fieldset, null);
				append(form, t9);
				append(form, div1);
				append(div1, input);
				current = true;
			},

			p: function update(changed, ctx) {
				var textinput0_changes = {};
				if (changed.isEmpty || changed.title) textinput0_changes.valid = !isEmpty(ctx.title);
				if (!updating_value && changed.title) {
					textinput0_changes.value = ctx.title;
				}
				textinput0.$set(textinput0_changes);

				var textinput1_changes = {};
				if (!updating_value_1 && changed.subtitle) {
					textinput1_changes.value = ctx.subtitle;
				}
				textinput1.$set(textinput1_changes);

				if (changed.description) textarea.value = ctx.description;

				var textinput2_changes = {};
				if (!updating_value_2 && changed.imageURL) {
					textinput2_changes.value = ctx.imageURL;
				}
				textinput2.$set(textinput2_changes);

				var textinput3_changes = {};
				if (!updating_value_3 && changed.address) {
					textinput3_changes.value = ctx.address;
				}
				textinput3.$set(textinput3_changes);

				var textinput4_changes = {};
				if (changed.isValidEmail || changed.contact || changed.isEmpty) textinput4_changes.valid = isValidEmail(ctx.contact) && !isEmpty(ctx.contact);
				if (!updating_value_4 && changed.contact) {
					textinput4_changes.value = ctx.contact;
				}
				textinput4.$set(textinput4_changes);

				if ((!current || changed.contact || changed.title) && input_disabled_value !== (input_disabled_value = !isValidEmail(ctx.contact) || isEmpty(ctx.contact) ||isEmpty(ctx.title))) {
					input.disabled = input_disabled_value;
				}
			},

			i: function intro(local) {
				if (current) return;
				textinput0.$$.fragment.i(local);

				textinput1.$$.fragment.i(local);

				textinput2.$$.fragment.i(local);

				textinput3.$$.fragment.i(local);

				textinput4.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				textinput0.$$.fragment.o(local);
				textinput1.$$.fragment.o(local);
				textinput2.$$.fragment.o(local);
				textinput3.$$.fragment.o(local);
				textinput4.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(form);
				}

				textinput0.$destroy();

				textinput1.$destroy();

				textinput2.$destroy();

				textinput3.$destroy();

				textinput4.$destroy();

				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	  let { title = "", subtitle = "", description = "", imageURL = "", address = "", contact = "" } = $$props;

		function textinput0_value_binding(value) {
			title = value;
			$$invalidate('title', title);
		}

		function textinput1_value_binding(value_1) {
			subtitle = value_1;
			$$invalidate('subtitle', subtitle);
		}

		function textarea_input_handler() {
			description = this.value;
			$$invalidate('description', description);
		}

		function textinput2_value_binding(value_2) {
			imageURL = value_2;
			$$invalidate('imageURL', imageURL);
		}

		function textinput3_value_binding(value_3) {
			address = value_3;
			$$invalidate('address', address);
		}

		function textinput4_value_binding(value_4) {
			contact = value_4;
			$$invalidate('contact', contact);
		}

		function submit_handler() {
			return customMeetupsStore.addMeetup();
		}

		$$self.$set = $$props => {
			if ('title' in $$props) $$invalidate('title', title = $$props.title);
			if ('subtitle' in $$props) $$invalidate('subtitle', subtitle = $$props.subtitle);
			if ('description' in $$props) $$invalidate('description', description = $$props.description);
			if ('imageURL' in $$props) $$invalidate('imageURL', imageURL = $$props.imageURL);
			if ('address' in $$props) $$invalidate('address', address = $$props.address);
			if ('contact' in $$props) $$invalidate('contact', contact = $$props.contact);
		};

		return {
			title,
			subtitle,
			description,
			imageURL,
			address,
			contact,
			textinput0_value_binding,
			textinput1_value_binding,
			textarea_input_handler,
			textinput2_value_binding,
			textinput3_value_binding,
			textinput4_value_binding,
			submit_handler
		};
	}

	class CreateForm extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["title", "subtitle", "description", "imageURL", "address", "contact"]);
		}

		get title() {
			throw new Error("<CreateForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set title(value) {
			throw new Error("<CreateForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get subtitle() {
			throw new Error("<CreateForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set subtitle(value) {
			throw new Error("<CreateForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get description() {
			throw new Error("<CreateForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set description(value) {
			throw new Error("<CreateForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get imageURL() {
			throw new Error("<CreateForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set imageURL(value) {
			throw new Error("<CreateForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get address() {
			throw new Error("<CreateForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set address(value) {
			throw new Error("<CreateForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get contact() {
			throw new Error("<CreateForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set contact(value) {
			throw new Error("<CreateForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/features/header/header.svelte generated by Svelte v3.3.0 */

	const file$2 = "src/features/header/header.svelte";

	function create_fragment$2(ctx) {
		var nav, a0, t_1, a1;

		return {
			c: function create() {
				nav = element("nav");
				a0 = element("a");
				a0.textContent = "Cleanup Goa";
				t_1 = space();
				a1 = element("a");
				a1.textContent = "Organise a Cleanup";
				a0.className = "link dim black b f6 f5-ns dib mr3";
				a0.href = "/";
				a0.title = "Home";
				add_location(a0, file$2, 5, 2, 90);
				a1.className = "link dim gray    f6 f5-ns dib mr3";
				a1.href = "/";
				a1.title = "Store";
				add_location(a1, file$2, 8, 2, 183);
				nav.className = "pa3 pa4-ns flex justify-between w-100";
				add_location(nav, file$2, 4, 0, 36);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, nav, anchor);
				append(nav, a0);
				append(nav, t_1);
				append(nav, a1);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(nav);
				}
			}
		};
	}

	class Header extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$2, safe_not_equal, []);
		}
	}

	/* src/features/meetups/meetup.svelte generated by Svelte v3.3.0 */

	const file$3 = "src/features/meetups/meetup.svelte";

	// (27:8) {:else}
	function create_else_block(ctx) {
		var small, dispose;

		return {
			c: function create() {
				small = element("small");
				small.textContent = "Mark Favourite";
				small.className = "pointer";
				add_location(small, file$3, 27, 8, 785);
				dispose = listen(small, "click", ctx.click_handler_1);
			},

			m: function mount(target, anchor) {
				insert(target, small, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(small);
				}

				dispose();
			}
		};
	}

	// (25:8) {#if isFavourite}
	function create_if_block$1(ctx) {
		var small, dispose;

		return {
			c: function create() {
				small = element("small");
				small.textContent = "Favourite";
				small.className = "green pointer";
				add_location(small, file$3, 25, 8, 670);
				dispose = listen(small, "click", ctx.click_handler);
			},

			m: function mount(target, anchor) {
				insert(target, small, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(small);
				}

				dispose();
			}
		};
	}

	function create_fragment$3(ctx) {
		var article, a, div2, div0, img, t0, div1, h1, t1, t2, t3, p0, t5, p1;

		function select_block_type(ctx) {
			if (ctx.isFavourite) return create_if_block$1;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block = current_block_type(ctx);

		return {
			c: function create() {
				article = element("article");
				a = element("a");
				div2 = element("div");
				div0 = element("div");
				img = element("img");
				t0 = space();
				div1 = element("div");
				h1 = element("h1");
				t1 = text(ctx.title);
				t2 = space();
				if_block.c();
				t3 = space();
				p0 = element("p");
				p0.textContent = "Whale is the common name for a widely distributed and diverse group of\n          fully aquatic placental marine mammals. They are an informal grouping\n          within the infraorder Cetacea, usually excluding dolphins and\n          porpoises.";
				t5 = space();
				p1 = element("p");
				p1.textContent = "By Robin Darnell";
				img.src = ctx.imageURL;
				img.className = "db";
				img.alt = "Photo of a whale's tale coming crashing out of\n        the water.";
				add_location(img, file$3, 12, 8, 350);
				div0.className = "pr3-ns mb4 mb0-ns w-100 w-40-ns";
				add_location(div0, file$3, 11, 6, 296);
				h1.className = "f3 fw1 baskerville mt0 lh-title";
				add_location(h1, file$3, 20, 8, 558);
				p0.className = "f6 f5-l lh-copy";
				add_location(p0, file$3, 30, 8, 899);
				p1.className = "f6 lh-copy mv0";
				add_location(p1, file$3, 36, 8, 1202);
				div1.className = "w-100 w-60-ns pl3-ns";
				add_location(div1, file$3, 19, 6, 515);
				div2.className = "flex flex-column flex-row-ns";
				add_location(div2, file$3, 10, 4, 247);
				a.className = "db pv4 ph3 ph0-l no-underline black dim";
				a.href = "#0";
				add_location(a, file$3, 9, 2, 181);
				article.className = "bb b--black-10";
				add_location(article, file$3, 8, 0, 146);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, article, anchor);
				append(article, a);
				append(a, div2);
				append(div2, div0);
				append(div0, img);
				append(div2, t0);
				append(div2, div1);
				append(div1, h1);
				append(h1, t1);
				append(div1, t2);
				if_block.m(div1, null);
				append(div1, t3);
				append(div1, p0);
				append(div1, t5);
				append(div1, p1);
			},

			p: function update(changed, ctx) {
				if (changed.imageURL) {
					img.src = ctx.imageURL;
				}

				if (changed.title) {
					set_data(t1, ctx.title);
				}

				if (current_block_type !== (current_block_type = select_block_type(ctx))) {
					if_block.d(1);
					if_block = current_block_type(ctx);
					if (if_block) {
						if_block.c();
						if_block.m(div1, t3);
					}
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(article);
				}

				if_block.d();
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { imageURL, title, isFavourite, id } = $$props;

		function click_handler() {
			return customMeetupsStore.toggleFavourite(id);
		}

		function click_handler_1() {
			return customMeetupsStore.toggleFavourite(id);
		}

		$$self.$set = $$props => {
			if ('imageURL' in $$props) $$invalidate('imageURL', imageURL = $$props.imageURL);
			if ('title' in $$props) $$invalidate('title', title = $$props.title);
			if ('isFavourite' in $$props) $$invalidate('isFavourite', isFavourite = $$props.isFavourite);
			if ('id' in $$props) $$invalidate('id', id = $$props.id);
		};

		return {
			imageURL,
			title,
			isFavourite,
			id,
			click_handler,
			click_handler_1
		};
	}

	class Meetup_1 extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$3, safe_not_equal, ["imageURL", "title", "isFavourite", "id"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.imageURL === undefined && !('imageURL' in props)) {
				console.warn("<Meetup> was created without expected prop 'imageURL'");
			}
			if (ctx.title === undefined && !('title' in props)) {
				console.warn("<Meetup> was created without expected prop 'title'");
			}
			if (ctx.isFavourite === undefined && !('isFavourite' in props)) {
				console.warn("<Meetup> was created without expected prop 'isFavourite'");
			}
			if (ctx.id === undefined && !('id' in props)) {
				console.warn("<Meetup> was created without expected prop 'id'");
			}
		}

		get imageURL() {
			throw new Error("<Meetup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set imageURL(value) {
			throw new Error("<Meetup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get title() {
			throw new Error("<Meetup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set title(value) {
			throw new Error("<Meetup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get isFavourite() {
			throw new Error("<Meetup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set isFavourite(value) {
			throw new Error("<Meetup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get id() {
			throw new Error("<Meetup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set id(value) {
			throw new Error("<Meetup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/App.svelte generated by Svelte v3.3.0 */

	const file$4 = "src/App.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.meet = list[i];
		return child_ctx;
	}

	// (25:4) {#each $meetups as meet}
	function create_each_block(ctx) {
		var current;

		var meetup = new Meetup_1({
			props: {
			imageURL: ctx.meet.imageURL,
			title: ctx.meet.title,
			isFavourite: ctx.meet.isFavourite,
			id: ctx.meet.id
		},
			$$inline: true
		});

		return {
			c: function create() {
				meetup.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(meetup, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var meetup_changes = {};
				if (changed.$meetups) meetup_changes.imageURL = ctx.meet.imageURL;
				if (changed.$meetups) meetup_changes.title = ctx.meet.title;
				if (changed.$meetups) meetup_changes.isFavourite = ctx.meet.isFavourite;
				if (changed.$meetups) meetup_changes.id = ctx.meet.id;
				meetup.$set(meetup_changes);
			},

			i: function intro(local) {
				if (current) return;
				meetup.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				meetup.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				meetup.$destroy(detaching);
			}
		};
	}

	function create_fragment$4(ctx) {
		var link, t0, main, t1, section, t2, current;

		var header = new Header({ $$inline: true });

		var each_value = ctx.$meetups;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		var form = new CreateForm({ $$inline: true });

		return {
			c: function create() {
				link = element("link");
				t0 = space();
				main = element("main");
				header.$$.fragment.c();
				t1 = space();
				section = element("section");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t2 = space();
				form.$$.fragment.c();
				link.rel = "stylesheet";
				link.href = "https://unpkg.com/tachyons@4.10.0/css/tachyons.min.css";
				add_location(link, file$4, 1, 2, 16);
				section.className = "pa4";
				add_location(section, file$4, 23, 2, 461);
				main.className = "svelte-sm65bd";
				add_location(main, file$4, 21, 0, 432);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				append(document.head, link);
				insert(target, t0, anchor);
				insert(target, main, anchor);
				mount_component(header, main, null);
				append(main, t1);
				append(main, section);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(section, null);
				}

				append(main, t2);
				mount_component(form, main, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.$meetups) {
					each_value = ctx.$meetups;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(section, null);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				header.$$.fragment.i(local);

				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				form.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				header.$$.fragment.o(local);

				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				form.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				detach(link);

				if (detaching) {
					detach(t0);
					detach(main);
				}

				header.$destroy();

				destroy_each(each_blocks, detaching);

				form.$destroy();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let $meetups;

		validate_store(customMeetupsStore, 'meetups');
		subscribe($$self, customMeetupsStore, $$value => { $meetups = $$value; $$invalidate('$meetups', $meetups); });

		return { $meetups };
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$4, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
