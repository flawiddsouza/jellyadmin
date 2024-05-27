# migrating from jelly-database to jellyadmin
if [ -d ~/.local/bin/jelly-database ]
then
    sudo systemctl stop jelly-database
    sudo systemctl disable jelly-database
    sudo rm /lib/systemd/system/jelly-database.service

    mv ~/.local/bin/jelly-database ~/.local/bin/jellyadmin
    rm ~/.local/bin/jellyadmin/jelly-database-linux
fi

sudo systemctl stop jellyadmin
sudo systemctl disable jellyadmin

mkdir -p ~/.local/bin/jellyadmin/
wget https://github.com/flawiddsouza/jellyadmin/releases/download/v0.4.0/jellyadmin-linux.gz -O ~/.local/bin/jellyadmin/jellyadmin-linux.gz
gzip -d --force ~/.local/bin/jellyadmin/jellyadmin-linux.gz
chmod +x ~/.local/bin/jellyadmin/jellyadmin-linux

echo "[Unit]
Description=Runs JellyAdmin on system startup
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/.local/bin/jellyadmin
ExecStart=$HOME/.local/bin/jellyadmin/jellyadmin-linux

[Install]
WantedBy=multi-user.target" | sudo tee /lib/systemd/system/jellyadmin.service > /dev/null

sudo systemctl daemon-reload
sudo systemctl enable jellyadmin
sudo systemctl start jellyadmin

sleep 3

echo

sudo systemctl status jellyadmin
