# This Dockerfile is created for deploying the vesa-combined-services container which merges the backend and the db container into one

FROM hudaif747/vesa_db:latest

# Install Node.js and npm using apk (for Alpine)
RUN apk add --no-cache nodejs npm

# Set working directory for the backend
WORKDIR /app

# Copy backend files
COPY ./BACKEND/package*.json ./
RUN npm install
COPY ./BACKEND ./

# Copy the startup script
COPY ./start_services.sh /start_services.sh
RUN chmod +x /start_services.sh

# Expose backend and database ports
EXPOSE 5000 8529

# Start the services
CMD ["sh", "/start_services.sh"]
