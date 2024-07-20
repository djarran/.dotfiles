
# Multi-platform Packages
install_if_not_installed() {
    PACKAGE=$1
    if nix-env -q | grep -q "^$PACKAGE"; then
        echo "$PACKAGE is already installed."
    else
        echo "Installing $PACKAGE..."
        nix-env -i $PACKAGE
    fi
}

install_if_not_installed atuin
install_if_not_installed eza
install_if_not_installed fzf
install_if_not_installed lazygit
install_if_not_installed neovim
install_if_not_installed ripgrep
install_if_not_installed stow
install_if_not_installed tmux
install_if_not_installed zoxide

# Install antigen (zsh plugin manager)
ANTIGEN_FILE="$HOME/antigen.zsh"

install_antigen() {
    if [ -f "$ANTIGEN_FILE" ]; then
        echo "antigen is already installed."
    else
        curl -L git.io/antigen > antigen.zsh
        if [ $? -eq 0 ]; then
            echo "antigen installed successfully."
        else
            echo "Failed to install antigen. Exiting."
            exit 1
        fi
    fi
}

# Install kitty terminal
curl -s -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin

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
    git clone https://github.com/NvChad/starter ~/.config/nvim
else
    echo "NVChad already cloned"
fi

# Install catppuccin zsh theme
git clone git@github.com:catppuccin/zsh-syntax-highlighting.git ~/.zsh/themes/
mv ~/.zsh/themes/themes/catppuccin_frappe-zsh-syntax-highlighting.zsh ~/.zsh/themes/

# --------------------------------------------------------------------------

# Install OS Dependent Packages
OS=`uname`

if [ "$OS" = "Linux" ]; then
  echo "Installing Linux-specific Packages"

  nix-env -iA \
    nixpkgs.zsh \
    nixpkgs.feh \
    nixpkgs.arandr \
    nixpkgs.picom

  nix-env -i glibc-locales
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

  echo "Installing AeroSpace"
  brew install --cask nikitabobko/tap/aerospace

  echo "Installing JankyBorders"
  brew tap FelixKratz/formulae
  brew install borders
  brew services start borders
  # Install yabai
  # if ! brew list | grep -q "^yabai\$"; then
      # brew install koekeishiya/formulae/yabai
  # else
      # echo "yabai already installed"
  # fi

  # Install skhd (System-wide keybindings via config file)
  # brew install koekeishiya/formulae/skhd
  # skhd --start-service
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

# Instructions for installing TPM plugins
echo "To install TPM (Tmux Plugin Manager) plugins, please do the following:"
echo
echo "1. Open your tmux session."
echo "2. Press 'prefix + I' (usually 'Ctrl + b' followed by 'I')."
echo
echo "This will:"
echo "  - Install new plugins from GitHub or any other git repository."
echo "  - Refresh the TMUX environment."
