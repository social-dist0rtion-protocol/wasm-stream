#!/bin/bash
# For Ubuntu 20.04

# NOTE: NEEDS TO BE RUN FROM THE SCRIPT DIRECTORY!!
# To execute this script, give it execution permission using `chmod`
# $ chmod +x ./provision

# We need root privileges. We simply exit if we don't have them.
if [[ $(/usr/bin/id -u) -ne 0 ]]; then
    echo "Not running as root"
    exit
fi

apt-get update -y
apt-get upgrade -y

# Install dev dependencies
apt-get install -y vim git

# Install application dependencies
apt-get install -y at libsasl2-modules apache2-utils python3-pip nginx \
  software-properties-common python-dev build-essential nginx-extras 
add-apt-repository universe
apt-get update -y

apt-get install -y certbot python3-certbot-nginx

echo "Installing Nodejs and npm."

curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
apt-get install -y nodejs

echo "--- NGINX CONFIGURATION START --"

mkdir -p /tmp/nginx/cache/site

NGINX_MAIN_CONFIG=/etc/nginx/nginx.conf

echo "Opening port 80 and 443 for nginx."
ufw allow https comment 'Open all to access Nginx port 443'
ufw allow http comment 'Open access Nginx port 80'
echo "Opening port 22 for SSH."
ufw allow ssh
echo "Opening port 873 for rsync."
ufw allow 873
ufw enable 

read -p "Enter domain name (e.g. sub.domain.com): " DOMAIN

echo "Copying nginx configuration."
cp ./nginx-letsencrypt.conf $NGINX_MAIN_CONFIG

echo "Registering SSL certificate with Letsencrypt."
certbot certonly --nginx -d $DOMAIN

echo "Copying final nginx configuration."
cp ./nginx-final.conf /etc/nginx/nginx.conf
sed -i "s/{DOMAIN}/${DOMAIN}/" $NGINX_MAIN_CONFIG

echo "Creating data dir"
mkdir -p /var/www/html/assets/
cp ./impressum.html /var/www/html/assets/impressum.html

echo "Enabling & starting the nginx service."
systemctl enable nginx
systemctl start nginx
nginx -s reload

echo "--- NGINX CONFIGURATION END ---"
