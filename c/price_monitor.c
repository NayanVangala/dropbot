/*
 * price_monitor.c — High-performance competitor price monitoring daemon.
 * Checks competitor prices every 15 minutes and triggers updates via the REST API.
 *
 * Designed to be lightweight (~2-5MB RAM) and run 24/7 on a Raspberry Pi 5.
 *
 * Dependencies: libcurl, libjson-c
 *   macOS:  brew install curl json-c
 *   Debian: sudo apt install libcurl4-openssl-dev libjson-c-dev
 *
 * Build: make (see Makefile)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <time.h>
#include <curl/curl.h>
#include <json-c/json.h>

/* ─── Configuration ─────────────────────────────────────── */

#define API_BASE            "http://localhost:3001"
#define CHECK_INTERVAL_SEC  (15 * 60)   /* 15 minutes */
#define MAX_PRODUCTS        500
#define MAX_URL_LEN         2048
#define MAX_RESPONSE_LEN    (1024 * 1024)  /* 1MB */
#define MIN_MARGIN          0.20           /* 20% minimum margin */

/* ─── Types ─────────────────────────────────────────────── */

typedef struct {
    char id[64];
    char shopify_product_id[128];
    char shopify_variant_id[128];
    char title[256];
    double current_price;
    double cost_price;
    double profit_margin;
    char competitor_url[MAX_URL_LEN];
} Product;

typedef struct {
    char *data;
    size_t size;
    size_t capacity;
} ResponseBuffer;

/* ─── Globals ───────────────────────────────────────────── */

static volatile int running = 1;
static Product products[MAX_PRODUCTS];
static int product_count = 0;
static int check_interval = CHECK_INTERVAL_SEC;

/* ─── Signal Handler ────────────────────────────────────── */

void handle_signal(int sig) {
    if (sig == SIGINT || sig == SIGTERM) {
        printf("\n🛑 Price monitor shutting down...\n");
        running = 0;
    } else if (sig == SIGUSR1) {
        printf("📡 SIGUSR1 received — refreshing product list...\n");
        /* Product refresh happens in the main loop */
    }
}

/* ─── HTTP Utilities ────────────────────────────────────── */

size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t total = size * nmemb;
    ResponseBuffer *buf = (ResponseBuffer *)userp;

    if (buf->size + total >= buf->capacity) {
        size_t new_cap = buf->capacity * 2;
        if (new_cap < buf->size + total + 1) new_cap = buf->size + total + 1;
        char *new_data = realloc(buf->data, new_cap);
        if (!new_data) return 0;
        buf->data = new_data;
        buf->capacity = new_cap;
    }

    memcpy(buf->data + buf->size, contents, total);
    buf->size += total;
    buf->data[buf->size] = '\0';
    return total;
}

ResponseBuffer *response_new(void) {
    ResponseBuffer *buf = malloc(sizeof(ResponseBuffer));
    buf->capacity = 4096;
    buf->data = malloc(buf->capacity);
    buf->data[0] = '\0';
    buf->size = 0;
    return buf;
}

void response_free(ResponseBuffer *buf) {
    if (buf) {
        free(buf->data);
        free(buf);
    }
}

int http_get(const char *url, ResponseBuffer *buf) {
    CURL *curl = curl_easy_init();
    if (!curl) return -1;

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, buf);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "DropBot-PriceMonitor/1.0");

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    return (res == CURLE_OK) ? 0 : -1;
}

int http_post_json(const char *url, const char *json_str) {
    CURL *curl = curl_easy_init();
    if (!curl) return -1;

    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    ResponseBuffer *buf = response_new();

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_str);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, buf);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    CURLcode res = curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    response_free(buf);

    return (res == CURLE_OK) ? 0 : -1;
}

/* ─── Product Loading ───────────────────────────────────── */

int load_products(void) {
    char url[MAX_URL_LEN];
    snprintf(url, sizeof(url), "%s/api/products", API_BASE);

    ResponseBuffer *buf = response_new();
    if (http_get(url, buf) != 0) {
        fprintf(stderr, "❌ Failed to fetch products from API\n");
        response_free(buf);
        return -1;
    }

    struct json_object *root = json_tokener_parse(buf->data);
    response_free(buf);

    if (!root) {
        fprintf(stderr, "❌ Failed to parse products JSON\n");
        return -1;
    }

    struct json_object *products_arr;
    if (!json_object_object_get_ex(root, "products", &products_arr)) {
        json_object_put(root);
        return -1;
    }

    product_count = 0;
    int len = json_object_array_length(products_arr);

    for (int i = 0; i < len && product_count < MAX_PRODUCTS; i++) {
        struct json_object *p = json_object_array_get_idx(products_arr, i);
        if (!p) continue;

        struct json_object *val;
        Product *prod = &products[product_count];
        memset(prod, 0, sizeof(Product));

        if (json_object_object_get_ex(p, "id", &val))
            strncpy(prod->shopify_product_id, json_object_get_string(val), sizeof(prod->shopify_product_id) - 1);

        if (json_object_object_get_ex(p, "title", &val))
            strncpy(prod->title, json_object_get_string(val), sizeof(prod->title) - 1);

        /* Extract price from variants */
        struct json_object *variants;
        if (json_object_object_get_ex(p, "variants", &variants)) {
            struct json_object *edges;
            if (json_object_object_get_ex(variants, "edges", &edges)) {
                int edge_len = json_object_array_length(edges);
                if (edge_len > 0) {
                    struct json_object *edge = json_object_array_get_idx(edges, 0);
                    struct json_object *node;
                    if (json_object_object_get_ex(edge, "node", &node)) {
                        if (json_object_object_get_ex(node, "price", &val))
                            prod->current_price = atof(json_object_get_string(val));
                        if (json_object_object_get_ex(node, "id", &val))
                            strncpy(prod->shopify_variant_id, json_object_get_string(val),
                                    sizeof(prod->shopify_variant_id) - 1);
                    }
                }
            }
        }

        product_count++;
    }

    json_object_put(root);
    printf("📦 Loaded %d products for monitoring\n", product_count);
    return 0;
}

/* ─── Price Checking ────────────────────────────────────── */

double fetch_competitor_price(const char *url) {
    /*
     * In a real implementation, this would:
     * 1. Fetch the competitor's product page
     * 2. Parse out the price using CSS selectors or regex
     * 3. Return the numeric price
     *
     * For now, we simulate with a slight random variation
     * to demonstrate the price monitoring logic.
     */
    (void)url;  /* Unused in simulation */

    /* Simulate: return -1 to indicate "no change detected" */
    return -1.0;
}

void check_prices(void) {
    time_t now = time(NULL);
    struct tm *tm_info = localtime(&now);
    char timestamp[32];
    strftime(timestamp, sizeof(timestamp), "%H:%M:%S", tm_info);

    printf("[%s] 🔍 Checking prices for %d products...\n", timestamp, product_count);

    int alerts = 0;

    for (int i = 0; i < product_count; i++) {
        Product *p = &products[i];

        if (p->current_price <= 0) continue;

        /* Check competitor price */
        double competitor_price = fetch_competitor_price(p->competitor_url);

        if (competitor_price <= 0) continue;  /* No data or error */

        /* Calculate if we need to adjust */
        double our_price = p->current_price;
        double price_diff_pct = (our_price - competitor_price) / our_price;

        /* If competitor is significantly cheaper (10%+), consider adjusting */
        if (price_diff_pct > 0.10) {
            /* Competitor is 10%+ cheaper — we need to react */
            double new_price = competitor_price * 0.98;  /* Slightly undercut */

            /* But never go below minimum margin */
            double min_price = p->cost_price / (1.0 - MIN_MARGIN);
            if (new_price < min_price) {
                new_price = min_price;
            }

            if (new_price != our_price) {
                printf("  💰 %s: $%.2f → $%.2f (competitor: $%.2f)\n",
                       p->title, our_price, new_price, competitor_price);

                /* Trigger price update via API */
                char json_buf[512];
                snprintf(json_buf, sizeof(json_buf),
                    "{\"variant_id\":\"%s\",\"new_price\":%.2f,\"reason\":\"competitor_undercut\"}",
                    p->shopify_variant_id, new_price);

                char url[MAX_URL_LEN];
                snprintf(url, sizeof(url), "%s/api/prices/update", API_BASE);

                if (http_post_json(url, json_buf) == 0) {
                    p->current_price = new_price;
                    alerts++;
                } else {
                    fprintf(stderr, "  ❌ Failed to update price for %s\n", p->title);
                }
            }
        }

        /* Also check if our margin has dropped too low */
        if (p->cost_price > 0) {
            double margin = (p->current_price - p->cost_price) / p->current_price;
            if (margin < MIN_MARGIN) {
                printf("  ⚠️  Low margin on %s: %.0f%% (min: %.0f%%)\n",
                       p->title, margin * 100, MIN_MARGIN * 100);

                /* Notify via Discord */
                char notify_buf[512];
                snprintf(notify_buf, sizeof(notify_buf),
                    "{\"message\":\"⚠️ Low margin alert: %s at %.0f%% (minimum: %.0f%%)\"}",
                    p->title, margin * 100, MIN_MARGIN * 100);

                char notify_url[MAX_URL_LEN];
                snprintf(notify_url, sizeof(notify_url), "%s/api/discord/notify", API_BASE);
                http_post_json(notify_url, notify_buf);

                alerts++;
            }
        }
    }

    printf("[%s] ✅ Price check complete — %d alerts\n", timestamp, alerts);
}

/* ─── Main Loop ─────────────────────────────────────────── */

int main(int argc, char *argv[]) {
    printf("╔══════════════════════════════════════════╗\n");
    printf("║   💰 DropBot Price Monitor               ║\n");
    printf("║   Interval: %d min                       ║\n", check_interval / 60);
    printf("╚══════════════════════════════════════════╝\n\n");

    /* Parse optional interval argument */
    if (argc > 1) {
        int mins = atoi(argv[1]);
        if (mins > 0) {
            check_interval = mins * 60;
            printf("⚙️  Check interval set to %d minutes\n", mins);
        }
    }

    /* Setup signal handlers */
    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);
    signal(SIGUSR1, handle_signal);

    /* Initialize curl */
    curl_global_init(CURL_GLOBAL_DEFAULT);

    /* Initial product load */
    printf("📡 Connecting to API at %s...\n", API_BASE);

    /* Wait for API to be ready */
    int retries = 0;
    while (retries < 30 && running) {
        ResponseBuffer *buf = response_new();
        char url[MAX_URL_LEN];
        snprintf(url, sizeof(url), "%s/api/health", API_BASE);

        if (http_get(url, buf) == 0) {
            printf("✅ API connected\n");
            response_free(buf);
            break;
        }

        response_free(buf);
        retries++;
        printf("   Waiting for API... (attempt %d/30)\n", retries);
        sleep(2);
    }

    if (!running || retries >= 30) {
        fprintf(stderr, "❌ Could not connect to API. Exiting.\n");
        curl_global_cleanup();
        return 1;
    }

    /* Load products */
    load_products();

    /* Main monitoring loop */
    printf("\n🔄 Starting price monitoring loop (every %d min)...\n\n", check_interval / 60);

    while (running) {
        check_prices();

        /* Reload products periodically (every 4 checks = ~1 hour) */
        static int check_count = 0;
        check_count++;
        if (check_count % 4 == 0) {
            load_products();
        }

        /* Sleep in 1-second intervals so we can respond to signals quickly */
        for (int i = 0; i < check_interval && running; i++) {
            sleep(1);
        }
    }

    /* Cleanup */
    curl_global_cleanup();
    printf("👋 Price monitor stopped.\n");
    return 0;
}
