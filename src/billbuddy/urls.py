from django.conf.urls import patterns, url

from billbuddy import views

urlpatterns = patterns('',
    # ex: /polls/
    url(r'^$', views.index, name='index'),
    url(r'^order/(?P<restaurant_id>\d+)/$', views.order, name='order'),

)