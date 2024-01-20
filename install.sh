# Check if Nix is already sourced
if [ ! -f "${HOME}/.nix-profile/etc/profile.d/nix.sh" ]; then
  echo 'Installing Nix Package Manager'
  curl -L https://nixos.org/nix/install | sh -s -- --no-daemon
else
  echo 'Nix Package Manager already installed'
fi

# Source nix
. "${HOME}/.nix-profile/etc/profile.d/nix.sh"

# --------------------------------------------------------------------------

# Multi-platform Packages
nix-env -iA \
  nixpkgs.kitty   \
  nixpkgs.antigen \
  nixpkgs.eza     \
  nixpkgs.fzf     \
  nixpkgs.tmux    \
  nixpkgs.atuin   \
  nixpkgs.lazygit \
  nixpkgs.stow    \
  nixpkgs.neovim  \
  nixpkgs.ripgrep

# --------------------------------------------------------------------------

# Install TPM (Tmux Package Manager)
if [ ! -d "${HOME}/.tmux/plugins/tpm" ]; then
    echo "Installing TPM"
    git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
else
    echo "TPM already cloned"
fi

# Install NVChad
if [ ! -d "${HOME}/.config/nvim/lua/plugins" ]; then
    echo "Installing NVChad"
    git clone https://github.com/NvChad/NvChad ~/.config/nvim --depth 1
else
    echo "NVChad already cloned"
fi

# --------------------------------------------------------------------------

# Install OS Dependent Packages
OS=`uname`

if [ "$OS" = "Linux" ]; then
  echo "Installing Linux-specific Packages"

  # Install i3wm
  # nix-env -i i3 
  # nix-env -i feh # wallpaper
  # nix-env -i picom # window corners and transparency

  nix-env -i zsh

  # Add zsh as a login shell
  command -v zsh | sudo tee -a /etc/shells

  # Use zsh as default shell
  sudo chsh -s $(which zsh) $USER

elif [ "$OS" = "Darwin" ]; then 
  #Install homebrew
  if ! command -v brew &> /dev/null; then
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
      echo "Homebrew already installed"
  fi

  echo "Installing macOS-specific Packages"

  # Install yabai
  if ! brew list | grep -q "^yabai\$"; then
      brew install koekeishiya/formulae/yabai
  else
      echo "yabai already installed"
  fi

  # Install skhd (System-wide keybindings via config file)
  brew install koekeishiya/formulae/skhd
  skhd --start-service
fi

# --------------------------------------------------------------------------

# Stow Multi-platform Configs
echo "Stowing neovim config..."
stow nvim

echo "Stowing tmux config..."
stow tmux

echo "Stowing kitty.conf..."
stow kitty

echo "Stowing .zshrc..."
stow zsh

if [ "$OS" = "Linux" ]; then
  stow i3
elif [ "$OS" = "Darwin" ]; then 
  stow yabai
  stow skhd
fi

# --------------------------------------------------------------------------

# Install NerdFont
if [ "$OS" = "Linux" ]; then
  if ! fc-list | grep -q 'Monaspice'; then
    echo 'Installing Monaspice Font'
    wget -P /tmp https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/Monaspace.zip
    unzip /tmp/Monaspace.zip -d ~/.fonts/
    fc-cache -fv
  else
    echo 'Monaspice Font Already Installed'
  fi
elif [ "$OS" = "Darwin" ]; then 
  if ! system_profiler SPFontsDataType | grep -q 'Monaspice'; then
    echo 'Installing Monaspice Font'
    curl -L -o /tmp/Monaspace.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/Monaspace.zip
    unzip /tmp/Monaspace.zip -d ~/Library/Fonts/
  else
    echo 'Monaspice Font Already Installed'
  fi
fi
