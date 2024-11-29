. ~/.nix-profile/etc/profile.d/nix.sh

# https://unix.stackexchange.com/questions/187402/nix-package-manager-perl-warning-setting-locale-failed
export LOCALE_ARCHIVE="$(nix-env --installed --no-name --out-path --query glibc-locales)/lib/locale/locale-archive"

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

eval `keychain --eval`
  keychain --nogui --quiet --timeout 240 id_rsa_github id_rsa_bitbucket id_rsa_gitlab_two id_rsa_gitlab_eu id_rsa_gitlab_ca id_rsa_gitlab_mahara

  if [ -f ~/.config/docker-dev/config ]; then
    eval $(grep "^DOCKER_DEV_ROOT=" ~/.config/docker-dev/config)
    eval "$(_CONTROL_COMPLETE=bash_source control)"
  fi

  alias gc='git clean -ffd && git submodule sync && git submodule update --init --recursive --force --jobs 16'


# eval "$(zoxide init zsh)"

# Change directory aliases
alias cdd='cd ../'
alias cddd='cd ../../'
alias cdddd='cd ../../../'

alias lz='lazygit'

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
alias ls='exa'

eval "$(zoxide init zsh)"

# Starship (custom prompt): https://starship.rs/
eval "$(starship init zsh)"

eval "$(atuin init zsh)"

export PATH=$PATH:/usr/local/go/bin

# if [ -e /home/djarrancotleanu/.nix-profile/etc/profile.d/nix.sh ]; then . /home/djarrancotleanu/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
