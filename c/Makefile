# DropBot Price Monitor — Build Configuration
# Dependencies: libcurl, libjson-c
#
# macOS:  brew install curl json-c
# Debian: sudo apt install libcurl4-openssl-dev libjson-c-dev

CC = gcc
CFLAGS = -O2 -Wall -Wextra -pedantic -std=c11
LDFLAGS = -lcurl -ljson-c

# Detect platform for include/lib paths
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    # macOS — Homebrew paths
    BREW_PREFIX := $(shell brew --prefix 2>/dev/null || echo /usr/local)
    CFLAGS += -I$(BREW_PREFIX)/include
    LDFLAGS += -L$(BREW_PREFIX)/lib
    # For Apple Silicon
    ifneq ($(wildcard /opt/homebrew),)
        CFLAGS += -I/opt/homebrew/include
        LDFLAGS += -L/opt/homebrew/lib
    endif
endif

TARGET = price_monitor
SRC = price_monitor.c

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)
	@echo "✅ Built $(TARGET)"

clean:
	rm -f $(TARGET) *.o
	@echo "🗑️  Cleaned"

run: $(TARGET)
	./$(TARGET)

# Build for Raspberry Pi (ARM64) — cross compile from Mac
pi:
	aarch64-linux-gnu-gcc $(CFLAGS) -o $(TARGET)_arm64 $(SRC) $(LDFLAGS)
	@echo "✅ Built $(TARGET)_arm64 for Raspberry Pi"
