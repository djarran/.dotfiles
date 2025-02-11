# Lines configured by zsh-newuser-install
HISTFILE=~/.histfile
HISTSIZE=1000
SAVEHIST=1000
bindkey -v
# End of lines configured by zsh-newuser-install
# The following lines were added by compinstall

zstyle :compinstall filename '/home/djarrancotleanu/.zshrc'

# Enables completion
autoload -Uz compinit bashcompinit
compinit
bashcompinit
# End of lines added by compinstall

# Work-related Items
if [[ "$(hostname)" == "catau-bri-laptop2061" ]]; then

  keychain --nogui --quiet --timeout 240 id_rsa_github id_rsa_bitbucket id_rsa_gitlab id_rsa_gitlab_eu

  if [ -f ~/.config/docker-dev/config ]; then
    eval $(grep "^DOCKER_DEV_ROOT=" ~/.config/docker-dev/config)
    eval "$(_CONTROL_COMPLETE=bash_source control)"
  fi

  alias gc='git clean -ffd && git submodule sync && git submodule update --init --recursive --force --jobs 16'

fi

# eval "$(zoxide init zsh)"

# Change directory aliases
alias cdd='cd ../'
alias cddd='cd ../../'
alias cdddd='cd ../../../'

# Antigen (zsh plugin manager): https://github.com/zsh-users/antigen
source $HOME/antigen.zsh

# zsh-vi-mode (vim motion in terminal): https://github.com/jeffreytse/zsh-vi-mode
antigen bundle jeffreytse/zsh-vi-mode
antigen bundle atuinsh/atuin@main
antigen bundle zsh-users/zsh-syntax-highlighting

antigen apply
source ~/.zsh/themes/catppuccin_frappe-zsh-syntax-highlighting.zsh

ZVM_VI_INSERT_ESCAPE_BINDKEY=jk
ZVM_VI_EDITOR=nvim

# Exa (ls alternative): https://the.exa.website/
alias ls='eza'
alias lz='lazygit'

export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin/"

eval "$(zoxide init zsh)"

# Starship (custom prompt): https://starship.rs/
eval "$(starship init zsh)"




# if [ -e /home/djarrancotleanu/.nix-profile/etc/profile.d/nix.sh ]; then . /home/djarrancotleanu/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Add RVM to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.rvm/bin"

. "$HOME/.atuin/bin/env"
eval "$(atuin init zsh)"
