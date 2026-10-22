# Allerbees build. Needs fibc (fibber >= 0.1.17) on PATH or FIBC=..., and WASI_SDK for the wasm build
# (fibber's scripts/fetch-wasm-tools.sh fetches the pinned wasi-sdk). The web client itself has no build step.
FIBC ?= fibc
SIM := sim/allerbees/*.fib
EXPORTS := sim-state-size=stateSize sim-init=init sim-step=step sim-tank-move=tankMove \
  sim-forager-collect=foragerCollect sim-forager-fly=foragerFly sim-forager-slip=foragerSlip \
  sim-forager-puff=foragerPuff sim-forager-home=foragerHome sim-salve-throw=salveThrow \
  sim-salve-hit=salveHit sim-salve-cloud=salveCloud sim-group-home=groupHome sim-set-human=setHuman

.PHONY: all wasm test specs web-test balance serve
all: wasm test

wasm: web/sim.wasm
web/sim.wasm: sim/wasm.fib $(SIM)
	$(FIBC) build -I sim sim/wasm.fib --target wasm32-wasi -o $@ $(addprefix --export ,$(EXPORTS))

test: specs web-test

specs:
	$(FIBC) test -I sim sim/specs

web-test: web/sim.wasm
	node --test tests/

balance:
	$(FIBC) run -I sim sim/tools/balance.fib

serve: web/sim.wasm
	node server/serve.mjs

# the sprite cutter (art/README.md); links zlib and libwebp
tools/cut-sprites: tools/cut-sprites.fib
	$(FIBC) build tools/cut-sprites.fib -o $@
