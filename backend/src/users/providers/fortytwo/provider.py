from allauth.socialaccount.providers.base import ProviderAccount
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider

class FortyTwoAccount(ProviderAccount):
    def get_avatar_url(self):
        return self.account.extra_data.get('image', {}).get('link')

    def to_str(self):
        dflt = super(FortyTwoAccount, self).to_str()
        return self.account.extra_data.get('login', dflt)

class FortyTwoProvider(OAuth2Provider):
    id = 'fortytwo'
    name = '42'
    account_class = FortyTwoAccount

    def extract_uid(self, data):
        return str(data['id'])

    def extract_common_fields(self, data):
        return dict(email=data.get('email'),
                    username=data.get('login'),
                    last_name=data.get('last_name'),
                    first_name=data.get('first_name'))

    def get_default_scope(self):
        return ['public']

provider_classes = [FortyTwoProvider]